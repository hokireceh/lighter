import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { strategiesTable, botLogsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { Telegraf, Markup } from "telegraf";
import { logger } from "./logger";
import { getMarkets } from "./marketCache";
import { analyzeMarketForStrategy, type MarketContext } from "./groqAI";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CONSECUTIVE_THRESHOLD = 5;
const COOLDOWN_MS = 2 * 60 * 60_000;        // 2 hours
const MAX_DAILY_TRIGGERS = 3;
const CONFIRMATION_TIMEOUT_MS = 20 * 60_000; // 20 minutes

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface GridConfig {
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  amountPerGrid: number;
  mode: "neutral" | "long" | "short";
  stopLoss?: number | null;
  takeProfit?: number | null;
  orderType?: "market" | "limit" | "post_only";
  limitPriceOffset?: number;
}

interface RerangeState {
  consecutiveCount: number;
  cooldownUntil: number;
  dailyCount: number;
  dailyWindowStart: number;
  hasPending: boolean;
}

interface PendingConfirmation {
  strategyId: number;
  userId: number | null;
  userChatId: string;
  newConfig: GridConfig;
  timeoutHandle: ReturnType<typeof setTimeout>;
  stopBotFn: (id: number) => Promise<boolean>;
  startBotFn: (id: number) => Promise<boolean>;
}

// ─── MODULE STATE ─────────────────────────────────────────────────────────────
const rerangeStates = new Map<number, RerangeState>();
const pendingConfirmations = new Map<string, PendingConfirmation>();
let _botTelegram: Telegraf["telegram"] | null = null;

// ─── PUBLIC SETUP ─────────────────────────────────────────────────────────────
export function setAutoRangeTelegramBot(telegram: Telegraf["telegram"]) {
  _botTelegram = telegram;
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────
function getOrCreateState(strategyId: number): RerangeState {
  if (!rerangeStates.has(strategyId)) {
    rerangeStates.set(strategyId, {
      consecutiveCount: 0,
      cooldownUntil: 0,
      dailyCount: 0,
      dailyWindowStart: Date.now(),
      hasPending: false,
    });
  }
  return rerangeStates.get(strategyId)!;
}

export function resetOutOfRangeCounter(strategyId: number) {
  const state = rerangeStates.get(strategyId);
  if (state) state.consecutiveCount = 0;
}

async function writeLog(
  userId: number | null,
  strategyId: number,
  strategyName: string,
  level: string,
  message: string,
  details?: string
) {
  try {
    await db.insert(botLogsTable).values({
      userId,
      strategyId,
      strategyName,
      level,
      message,
      details,
    });
  } catch (err) {
    logger.error({ err }, "autoRerange: failed to write log");
  }
}

function generateToken(): string {
  return randomBytes(8).toString("hex"); // 64-bit cryptographically secure entropy
}

async function getUserChatId(userId: number | null): Promise<string | null> {
  if (userId === null) return null;
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });
    return user?.telegramId ?? null;
  } catch {
    return null;
  }
}

async function sendWithKeyboard(
  chatId: string,
  text: string,
  keyboard: ReturnType<typeof Markup.inlineKeyboard>
): Promise<boolean> {
  if (!_botTelegram) {
    logger.warn("autoRerange: bot telegram not set, cannot send message");
    return false;
  }
  try {
    await _botTelegram.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      ...keyboard,
    });
    return true;
  } catch (err: any) {
    logger.warn({ chatId, err: err?.message }, "autoRerange: failed to send Telegram message");
    return false;
  }
}

async function sendPlain(chatId: string, text: string) {
  if (!_botTelegram) return;
  try {
    await _botTelegram.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err: any) {
    logger.warn({ chatId, err: err?.message }, "autoRerange: failed to send plain notification");
  }
}

// ─── TP/SL PROPORTIONAL CALCULATION ──────────────────────────────────────────
// CRITICAL RULE:
//   - If old SL was null → new SL MUST be null (never add SL if user didn't have one)
//   - If old TP was null → new TP MUST be null
//   - If old SL existed → recalculate proportionally using offset from lower bound
//   - If old TP existed → recalculate proportionally using offset from upper bound
function computeNewSlTp(
  config: GridConfig,
  newLower: number,
  newUpper: number
): { stopLoss: number | null; takeProfit: number | null } {
  const oldSL = config.stopLoss ?? null;
  const oldTP = config.takeProfit ?? null;

  let stopLoss: number | null = null;
  if (oldSL !== null && config.lowerPrice > 0) {
    const offset = (config.lowerPrice - oldSL) / config.lowerPrice;
    stopLoss = parseFloat((newLower * (1 - offset)).toFixed(2));
  }

  let takeProfit: number | null = null;
  if (oldTP !== null && config.upperPrice > 0) {
    const offset = (oldTP - config.upperPrice) / config.upperPrice;
    takeProfit = parseFloat((newUpper * (1 + offset)).toFixed(2));
  }

  return { stopLoss, takeProfit };
}

// ─── TIMEOUT: bot is paused if user doesn't respond in 20 minutes ─────────────
async function handleConfirmationTimeout(token: string) {
  const pending = pendingConfirmations.get(token);
  if (!pending) return;
  pendingConfirmations.delete(token);

  const { strategyId, userId, userChatId, stopBotFn } = pending;

  const state = rerangeStates.get(strategyId);
  if (state) state.hasPending = false;

  const strategy = await db.query.strategiesTable.findFirst({
    where: eq(strategiesTable.id, strategyId),
  });
  const strategyName = strategy?.name ?? `Strategy #${strategyId}`;

  await stopBotFn(strategyId);

  await writeLog(
    userId, strategyId, strategyName, "warn",
    "Auto-Rerange: Bot di-pause — tidak ada konfirmasi dalam 20 menit"
  );

  await sendPlain(
    userChatId,
    `⏸ *Bot Di-Pause*\n\nStrategy: *${strategyName}*\nTidak ada konfirmasi rerange dalam 20 menit.\n\nAtur manual di dashboard atau restart bot dari aplikasi.`
  );
}

// ─── CALLBACK HANDLERS (called from Telegram action registration) ─────────────
async function handleApprove(token: string, ctx: any): Promise<void> {
  const pending = pendingConfirmations.get(token);
  if (!pending) {
    await ctx.editMessageText("⚠️ Request sudah kedaluwarsa atau sudah diproses.");
    return;
  }
  clearTimeout(pending.timeoutHandle);
  pendingConfirmations.delete(token);

  const { strategyId, userId, newConfig, stopBotFn, startBotFn } = pending;

  const state = rerangeStates.get(strategyId);
  if (state) state.hasPending = false;

  const strategy = await db.query.strategiesTable.findFirst({
    where: eq(strategiesTable.id, strategyId),
  });
  if (!strategy) {
    await ctx.editMessageText("⚠️ Strategy tidak ditemukan di database.");
    return;
  }

  // Merge new grid params into existing config (preserve orderType, limitPriceOffset, etc.)
  const updatedConfig: GridConfig = {
    ...(strategy.gridConfig as GridConfig),
    lowerPrice: newConfig.lowerPrice,
    upperPrice: newConfig.upperPrice,
    gridLevels: newConfig.gridLevels,
    amountPerGrid: newConfig.amountPerGrid,
    mode: newConfig.mode,
    stopLoss: newConfig.stopLoss,
    takeProfit: newConfig.takeProfit,
  };

  await db.update(strategiesTable)
    .set({ gridConfig: updatedConfig, updatedAt: new Date() })
    .where(eq(strategiesTable.id, strategyId));

  await writeLog(
    userId, strategyId, strategy.name, "success",
    `Auto-Rerange disetujui — Range baru $${newConfig.lowerPrice.toFixed(2)} – $${newConfig.upperPrice.toFixed(2)}, Grid ${newConfig.gridLevels} levels`
  );

  // Stop then restart so grid state initialises fresh with new range.
  // A small buffer between stop and start ensures stopBot's DB write
  // (isRunning: false) fully commits before startBot reads and overwrites it
  // (isRunning: true). Without this, a write reorder under load could leave
  // the DB showing isRunning: false despite the bot being alive.
  await stopBotFn(strategyId);
  await new Promise(r => setTimeout(r, 200));
  await startBotFn(strategyId);

  resetOutOfRangeCounter(strategyId);

  await ctx.editMessageText(
    `✅ *Rerange Disetujui*\n\nStrategy: *${strategy.name}*\nRange baru: $${newConfig.lowerPrice.toFixed(2)} – $${newConfig.upperPrice.toFixed(2)}\n\nBot telah di-restart dengan konfigurasi baru.`,
    { parse_mode: "Markdown" }
  );
}

async function handleReject(token: string, ctx: any): Promise<void> {
  const pending = pendingConfirmations.get(token);
  if (!pending) {
    await ctx.editMessageText("⚠️ Request sudah kedaluwarsa atau sudah diproses.");
    return;
  }
  clearTimeout(pending.timeoutHandle);
  pendingConfirmations.delete(token);

  const { strategyId, userId, stopBotFn } = pending;

  const state = rerangeStates.get(strategyId);
  if (state) state.hasPending = false;

  const strategy = await db.query.strategiesTable.findFirst({
    where: eq(strategiesTable.id, strategyId),
  });
  const strategyName = strategy?.name ?? `Strategy #${strategyId}`;

  await stopBotFn(strategyId);

  await writeLog(
    userId, strategyId, strategyName, "warn",
    "Auto-Rerange ditolak oleh user — bot di-pause"
  );

  resetOutOfRangeCounter(strategyId);

  await ctx.editMessageText(
    `❌ *Rerange Ditolak*\n\nStrategy: *${strategyName}*\nBot di-pause. Atur manual di dashboard atau restart dari aplikasi.`,
    { parse_mode: "Markdown" }
  );
}

// ─── REGISTER TELEGRAM ACTION HANDLERS ───────────────────────────────────────
// Call this once inside startTelegramBot() after bot is created.
export function registerAutoRerangeHandlers(bot: Telegraf<any>) {
  // Callback data format: ar_approve_{strategyId}_{token}
  bot.action(/^ar_approve_(\d+)_([a-z0-9]+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const token = ctx.match[2];
    await handleApprove(token, ctx);
  });

  bot.action(/^ar_reject_(\d+)_([a-z0-9]+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const token = ctx.match[2];
    await handleReject(token, ctx);
  });
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────
// Called from botEngine.executeGridCheck when price is outside range.
// Returns:
//   "idle"      → nothing happened (threshold/cooldown/limit not met)
//   "triggered" → Telegram message sent, waiting for user confirmation
//   "paused"    → (reserved, currently timeout path notifies separately)
export async function checkAutoRerange(
  strategy: typeof strategiesTable.$inferSelect,
  currentPrice: Decimal,
  network: string,
  deps: {
    stopBotFn: (id: number) => Promise<boolean>;
    startBotFn: (id: number) => Promise<boolean>;
  }
): Promise<"idle" | "triggered"> {
  const strategyId = strategy.id;
  const userId = strategy.userId ?? null;
  const config = strategy.gridConfig as GridConfig | null;

  if (!config) return "idle";

  const state = getOrCreateState(strategyId);
  const now = Date.now();

  // If there is already a pending confirmation for this strategy, do nothing
  if (state.hasPending) return "triggered";

  // ─── Daily window reset ───
  if (now - state.dailyWindowStart >= 24 * 60 * 60_000) {
    state.dailyCount = 0;
    state.dailyWindowStart = now;
  }

  // ─── Increment consecutive out-of-range counter ───
  state.consecutiveCount += 1;

  if (state.consecutiveCount < CONSECUTIVE_THRESHOLD) {
    return "idle";
  }

  // ─── Cooldown check ───
  if (now < state.cooldownUntil) {
    const remainMins = Math.ceil((state.cooldownUntil - now) / 60_000);
    await writeLog(
      userId, strategyId, strategy.name, "info",
      `Auto-Rerange: cooldown aktif, sisa ${remainMins} menit`
    );
    return "idle";
  }

  // ─── Daily limit check ───
  if (state.dailyCount >= MAX_DAILY_TRIGGERS) {
    await writeLog(
      userId, strategyId, strategy.name, "warn",
      "Auto-Rerange: batas harian (3x) tercapai, tidak trigger hari ini"
    );
    return "idle";
  }

  // ─── All gates passed — TRIGGER ──────────────────────────────────────────
  state.consecutiveCount = 0;
  state.cooldownUntil = now + COOLDOWN_MS;
  state.dailyCount += 1;
  state.hasPending = true;

  await writeLog(
    userId, strategyId, strategy.name, "warn",
    `Auto-Rerange trigger: harga $${currentPrice.toFixed(2)} keluar range $${config.lowerPrice}–$${config.upperPrice} selama ${CONSECUTIVE_THRESHOLD} candle berturut-turut`
  );

  // ─── Get user chat ID ───
  const chatId = await getUserChatId(userId);
  if (!chatId) {
    await writeLog(
      userId, strategyId, strategy.name, "warn",
      "Auto-Rerange: user tidak terhubung Telegram, trigger diabaikan"
    );
    // Rollback state since we cannot send the confirmation
    state.hasPending = false;
    state.cooldownUntil = 0;
    state.dailyCount = Math.max(0, state.dailyCount - 1);
    return "idle";
  }

  // ─── Fetch market data for AI ───
  let marketInfo: Awaited<ReturnType<typeof getMarkets>>[0] | undefined;
  try {
    const markets = await getMarkets(network as any);
    marketInfo = markets.find(m => m.index === strategy.marketIndex);
  } catch (err) {
    logger.warn({ err }, "autoRerange: failed to fetch market info for AI");
  }

  const marketContext: MarketContext = {
    symbol: strategy.marketSymbol,
    type: marketInfo?.type ?? "perp",
    lastPrice: currentPrice.toNumber(),
    high24h: marketInfo?.dailyHigh ?? 0,
    low24h: marketInfo?.dailyLow ?? 0,
    volume24h: marketInfo?.dailyVolumeQuote ?? 0,
    priceChangePct24h: marketInfo?.dailyPriceChange ?? 0,
    minBaseAmount: marketInfo?.minBaseAmount ?? 0,
    minQuoteAmount: marketInfo?.minQuoteAmount ?? 10,
  };

  // ─── AI analysis ───
  let aiResult: Awaited<ReturnType<typeof analyzeMarketForStrategy>>;
  try {
    aiResult = await analyzeMarketForStrategy("grid", marketContext);
  } catch (err: any) {
    await writeLog(
      userId, strategyId, strategy.name, "warn",
      `Auto-Rerange: AI analysis gagal — ${err?.message ?? String(err)}`
    );
    // Rollback state
    state.hasPending = false;
    state.cooldownUntil = 0;
    state.dailyCount = Math.max(0, state.dailyCount - 1);
    return "idle";
  }

  const aiGrid = aiResult.grid_params;
  if (!aiGrid) {
    await writeLog(
      userId, strategyId, strategy.name, "warn",
      "Auto-Rerange: AI tidak menghasilkan grid_params"
    );
    state.hasPending = false;
    state.cooldownUntil = 0;
    state.dailyCount = Math.max(0, state.dailyCount - 1);
    return "idle";
  }

  // ─── TP/SL override (CRITICAL rule) ───────────────────────────────────────
  const { stopLoss: newSL, takeProfit: newTP } = computeNewSlTp(
    config,
    aiGrid.lowerPrice,
    aiGrid.upperPrice
  );

  const newConfig: GridConfig = {
    lowerPrice: aiGrid.lowerPrice,
    upperPrice: aiGrid.upperPrice,
    gridLevels: aiGrid.gridLevels,
    amountPerGrid: aiGrid.amountPerGrid,
    mode: aiGrid.mode,
    stopLoss: newSL,
    takeProfit: newTP,
    orderType: config.orderType,
    limitPriceOffset: config.limitPriceOffset,
  };

  // ─── Build confirmation message ────────────────────────────────────────────
  const token = generateToken();
  const approveData = `ar_approve_${strategyId}_${token}`;
  const rejectData  = `ar_reject_${strategyId}_${token}`;

  const slLine = newSL !== null ? `\n🛑 Stop Loss: $${newSL.toFixed(2)}` : "";
  const tpLine = newTP !== null ? `\n🎯 Take Profit: $${newTP.toFixed(2)}` : "";

  const message = [
    `⚠️ *Harga Keluar Range Grid!*`,
    ``,
    `📊 ${strategy.marketSymbol}`,
    `💰 Harga sekarang: $${currentPrice.toFixed(2)}`,
    `📉 Range lama: $${config.lowerPrice} - $${config.upperPrice}`,
    ``,
    `🤖 *AI Rekomendasi Range Baru:*`,
    `📈 Range baru: $${aiGrid.lowerPrice.toFixed(2)} - $${aiGrid.upperPrice.toFixed(2)}`,
    `🔢 Grid levels: ${aiGrid.gridLevels}`,
    `💵 Amount/grid: $${aiGrid.amountPerGrid.toFixed(2)}`,
    slLine,
    tpLine,
    ``,
    `💡 Alasan: ${aiResult.reasoning}`,
    ``,
    `⏱ Konfirmasi dalam 20 menit atau bot akan PAUSE otomatis.`,
  ].filter(l => l !== "").join("\n");

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Approve", approveData),
      Markup.button.callback("❌ Reject",  rejectData),
    ],
  ]);

  const sent = await sendWithKeyboard(chatId, message, keyboard);
  if (!sent) {
    await writeLog(
      userId, strategyId, strategy.name, "warn",
      "Auto-Rerange: gagal kirim pesan Telegram, trigger diabaikan"
    );
    state.hasPending = false;
    state.cooldownUntil = 0;
    state.dailyCount = Math.max(0, state.dailyCount - 1);
    return "idle";
  }

  // ─── Register pending with 20-minute timeout ───────────────────────────────
  const timeoutHandle = setTimeout(() => {
    handleConfirmationTimeout(token).catch(err =>
      logger.error({ err }, "autoRerange: error in timeout handler")
    );
  }, CONFIRMATION_TIMEOUT_MS);

  pendingConfirmations.set(token, {
    strategyId,
    userId,
    userChatId: chatId,
    newConfig,
    timeoutHandle,
    stopBotFn: deps.stopBotFn,
    startBotFn: deps.startBotFn,
  });

  logger.info(
    { strategyId, token, newLower: aiGrid.lowerPrice, newUpper: aiGrid.upperPrice },
    "autoRerange: confirmation sent, waiting for user response"
  );

  return "triggered";
}
