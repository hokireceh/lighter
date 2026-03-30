import Groq from "groq-sdk";
import { logger } from "./logger";

// ─── Multi-Key Pool ───────────────────────────────────────────────────────────
function loadApiKeys(): string[] {
  const keys: string[] = [];
  // Support GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, ... GROQ_API_KEY_10
  const primary = process.env.GROQ_API_KEY;
  if (primary) keys.push(primary);
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

let _keyIndex = 0;
function getNextKey(keys: string[]): string {
  const key = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;
  return key;
}

// ─── Auto Cascade - 5 Tier Model System ──────────────────────────────────────
const MODEL_TIERS = [
  { name: "llama-3.3-70b-versatile",                   dailyLimit: 1000,  quality: 10, description: "Premium (10/10)"  },
  { name: "moonshotai/kimi-k2-instruct",                dailyLimit: 1000,  quality: 9,  description: "High (9/10)"     },
  { name: "compound-beta",                              dailyLimit: 250,   quality: 8,  description: "Good (8/10)"     },
  { name: "meta-llama/llama-4-scout-17b-16e-instruct",  dailyLimit: 1000,  quality: 7,  description: "Scout (7/10)"    },
  { name: "llama-3.1-8b-instant",                       dailyLimit: 14400, quality: 6,  description: "Standard (6/10)" },
];

const TRADING_SYSTEM_PROMPT = `You are an expert algorithmic trading assistant specialized in the Lighter DEX (a ZK-rollup decentralized exchange on Ethereum). Your role is to analyze real-time market data and recommend optimal trading strategy parameters.

## Your Expertise
- Deep knowledge of DCA (Dollar Cost Averaging) and Grid Trading strategies
- Understanding of crypto market volatility, support/resistance levels, and trend analysis
- Expert in risk management and position sizing
- Familiar with Lighter DEX specifics: perpetuals and spot markets, zero-fee Standard Account structure
- Aware of order types: Limit, Market, Post-Only (maker-only execution)
- Understanding of Lighter's latency: Standard Account (200-300ms), Premium with LIT stake (140ms)

## Lighter DEX Fee Structure (Critical!)
**Standard Account**: Zero fees (maker 0%, taker 0%) → Always prioritize LIMIT/Post-Only orders
**Premium Account**: Discounted with LIT stake (maker 0.004%, taker 0.028%, up to 30% discount)
→ For retail/standard trading: LIMIT/Post-Only is strictly superior to MARKET orders (no fee cost)

## Strategy Knowledge

### DCA (Dollar Cost Averaging)
- Best for: trending markets (up for buy, down for sell), long-term accumulation
- Amount per order: based on available capital and risk tolerance (typically 1-5% of portfolio per order)
- Interval: shorter intervals (30-60 min) in high volatility, longer (2h-6h) for stable trends
  - Adjust +1 interval tier if volume < $2B (wider spreads/volatility)
  - Adjust -1 tier if volume > $10B (tighter execution)
- Order type recommendation: POST-ONLY or LIMIT (both maker, zero fees on Standard Account)
  - POST-ONLY: guaranteed maker, no taker fallback (use when confident in price level)
  - LIMIT: traditional execution, use offset to balance speed vs. fill rate
- Limit price offset: buy slightly below market (0.1-0.5% offset), sell slightly above
  - Increase offset by +0.2% during high volatility (>20% 24h range) to improve fill rate
  - Consider latency (200-300ms): offset mitigates slippage from order confirmation delay
- Cancel stale orders after 2x interval to refresh prices in volatile markets

### Grid Trading
- Best for: sideways/ranging markets with clear boundaries
- Lower/Upper price: typically set at key support/resistance levels
  - Conservative: ±5-10% range from current price (tight markets, low volatility)
  - Moderate: ±10-20% range (normal volatility, mixed sentiment)
  - Aggressive: ±20-40% range for high-volatility assets (volatility >15% 24h)
- Grid levels: more levels = smaller profits per trade but higher frequency
  - Tight range (<10%): 5-10 levels
  - Medium range (10-20%): 10-15 levels
  - Wide range (>20%): 15-20 levels
- Amount per grid: small enough that all grids can be filled simultaneously
- Mode:
  - neutral: trade both directions (best for true ranging markets)
  - long: only buy on dips (bullish bias, use in uptrends capped by resistance)
  - short: only sell on rallies (bearish bias, use in downtrends capped by support)
- Stop Loss: set below strong support (outside grid range by 5-10%), required for aggressive grids
- Take Profit: set above strong resistance (outside grid range by 5-10%), optional
- Order type: POST-ONLY strongly preferred (maker-only, zero fees, prevents accidental taker)
  - Fallback to LIMIT if Post-Only fills are too rare (volume-dependent)
  - Avoid MARKET orders (taker fees + slippage)

## Response Format
Always respond with a valid JSON object only, no markdown, no explanation outside JSON:
{
  "strategy": "dca" | "grid",
  "dca_params": {
    "amountPerOrder": number,          // USDC amount per order
    "intervalMinutes": number,          // interval between orders
    "side": "buy" | "sell",
    "orderType": "limit" | "post_only",
    "limitPriceOffset": number,         // USDC offset from market price
  } | null,
  "grid_params": {
    "lowerPrice": number,
    "upperPrice": number,
    "gridLevels": number,
    "amountPerGrid": number,            // USDC per grid level
    "mode": "neutral" | "long" | "short",
    "orderType": "limit" | "post_only",
    "limitPriceOffset": number,
    "stopLoss": number | null,          // must set for aggressive grids
    "takeProfit": number | null
  } | null,
  "reasoning": string,                  // 2-3 sentences explaining the recommendation
  "marketCondition": "bullish" | "bearish" | "sideways" | "volatile",
  "riskLevel": "low" | "medium" | "high",
  "volumeContext": "low" | "normal" | "high",
  "confidence": number                  // 0-100
}`;

export interface MarketContext {
  symbol: string;
  type: "perp" | "spot";
  lastPrice: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  priceChangePct24h: number;
  minBaseAmount: number;
  minQuoteAmount: number;
  availableBalance?: number;  // USDC available in user's account — diambil realtime dari Lighter
}

export interface DCAParams {
  amountPerOrder: number;
  intervalMinutes: number;
  side: "buy" | "sell";
  orderType: "limit" | "post_only";
  limitPriceOffset: number;
}

export interface GridParams {
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  amountPerGrid: number;
  mode: "neutral" | "long" | "short";
  orderType: "limit" | "post_only";
  limitPriceOffset: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface AIAnalysisResult {
  strategy: "dca" | "grid";
  dca_params: DCAParams | null;
  grid_params: GridParams | null;
  reasoning: string;
  marketCondition: "bullish" | "bearish" | "sideways" | "volatile";
  riskLevel: "low" | "medium" | "high";
  volumeContext: "low" | "normal" | "high";
  confidence: number;
  modelUsed: string;
  modelTier: string;
}

function buildUserPrompt(strategyType: "dca" | "grid", market: MarketContext): string {
  const range24h = market.high24h > 0 && market.low24h > 0
    ? `$${market.low24h.toFixed(2)} - $${market.high24h.toFixed(2)}`
    : "N/A";
  const volatility = market.high24h > 0 && market.low24h > 0
    ? (((market.high24h - market.low24h) / market.low24h) * 100).toFixed(1)
    : "N/A";

  const volumeContext = market.volume24h > 10e9 ? "high ($10B+)" 
    : market.volume24h > 2e9 ? "normal ($2-10B)" 
    : "low (<$2B)";

  return `Analyze this Lighter DEX market and recommend optimal ${strategyType.toUpperCase()} strategy parameters.
IMPORTANT: All numbers in your JSON response MUST use a dot (.) as the decimal separator, never a comma. Example: 64956.4 not 64956,4.

Market: ${market.symbol} (${market.type})
Current Price: $${market.lastPrice.toFixed(4)}
24h Range: ${range24h}
24h Volatility: ${volatility}%
24h Volume: $${market.volume24h.toFixed(0)} (${volumeContext})
24h Price Change: ${market.priceChangePct24h > 0 ? "+" : ""}${market.priceChangePct24h.toFixed(2)}%
Min Order Size (HARD LIMIT — MUST NOT GO BELOW): ${market.minBaseAmount} ${market.symbol.split("-")[0]} base OR $${market.minQuoteAmount} USDC quote, whichever is LARGER.
At current price $${market.lastPrice.toFixed(4)}, the minimum order in USDC = max($${market.minQuoteAmount}, ${market.minBaseAmount} × $${market.lastPrice.toFixed(4)}) = $${Math.max(market.minQuoteAmount, market.minBaseAmount * market.lastPrice).toFixed(2)} USDC.
You MUST set amountPerGrid (grid) or amountPerOrder (DCA) to AT LEAST 1.5× this value = $${(Math.max(market.minQuoteAmount, market.minBaseAmount * market.lastPrice) * 1.5).toFixed(2)} USDC. Orders below minimum are silently skipped by the exchange.

Strategy Type: ${strategyType.toUpperCase()}
Execution: Standard Account (zero maker/taker fees)
${(() => {
  const capital = market.availableBalance !== undefined
    ? `$${market.availableBalance.toFixed(2)} USDC (user's real available balance)`
    : "$1000 USDC (estimated)";
  return strategyType === "grid"
    ? `Capital Available: ${capital}. Size amountPerGrid so all grid levels can be filled simultaneously, AND above the minimum stated above. Provide appropriate stop-loss.`
    : `Capital Available: ${capital}. Size amountPerOrder conservatively (1-5% of capital per order), AND above the minimum stated above.`;
})()}

Return ONLY valid JSON matching the specification. Ensure strategy and appropriate params are set, others null.`;
}

async function callWithCascade(
  keys: string[],
  messages: Groq.Chat.ChatCompletionMessageParam[],
  startTierIndex: number = 0
): Promise<{ content: string; modelUsed: string; tierDescription: string }> {
  for (let i = startTierIndex; i < MODEL_TIERS.length; i++) {
    const tier = MODEL_TIERS[i];

    // Try every key for this model tier before dropping to next tier
    let lastErrMsg = "";
    let modelUnavailable = false;
    for (let k = 0; k < keys.length; k++) {
      const apiKey = getNextKey(keys);
      const client = new Groq({ apiKey });
      try {
        logger.info({ model: tier.name, tier: tier.description, keySlot: k + 1, totalKeys: keys.length }, "Trying AI model tier");
        const response = await client.chat.completions.create({
          model: tier.name,
          messages,
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content ?? "";
        if (!content) throw new Error("Empty response from model");

        logger.info({ model: tier.name, keySlot: k + 1 }, "AI model responded successfully");
        return { content, modelUsed: tier.name, tierDescription: tier.description };
      } catch (err: any) {
        lastErrMsg = err?.message ?? String(err);
        const isRateLimit = lastErrMsg.includes("429") || lastErrMsg.includes("rate_limit") || lastErrMsg.includes("rate limit");
        modelUnavailable = lastErrMsg.includes("model") || lastErrMsg.includes("404") || lastErrMsg.includes("not found") || lastErrMsg.includes("decommissioned");

        logger.warn({ model: tier.name, keySlot: k + 1, err: lastErrMsg }, isRateLimit ? "Key rate-limited, trying next key" : "Model error");

        // Model error (not rate limit) → no point trying other keys for this model
        if (!isRateLimit) break;
        // Rate limited → try next key in pool
      }
    }

    logger.warn({ model: tier.name, err: lastErrMsg }, `All keys failed for this tier, ${i < MODEL_TIERS.length - 1 ? "cascading to next tier" : "all tiers exhausted"}`);

    if (i === MODEL_TIERS.length - 1) {
      throw new Error(`All ${MODEL_TIERS.length} model tiers and ${keys.length} API key(s) exhausted. Last error: ${lastErrMsg}`);
    }
  }
  throw new Error("Cascade failed unexpectedly");
}

export async function analyzeMarketForStrategy(
  strategyType: "dca" | "grid",
  market: MarketContext
): Promise<AIAnalysisResult> {
  const keys = loadApiKeys();
  if (keys.length === 0) {
    throw new Error("GROQ_API_KEY is not configured. Please add it in Settings → Environment.");
  }

  logger.info({ totalKeys: keys.length }, "AI analysis started with key pool");

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: TRADING_SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(strategyType, market) },
  ];

  const { content, modelUsed, tierDescription } = await callWithCascade(keys, messages);

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`AI returned invalid JSON: ${content.substring(0, 200)}`);
  }

  // Validate structure: exactly one of dca_params or grid_params should be non-null
  const hasDCA = parsed.dca_params && typeof parsed.dca_params === "object";
  const hasGrid = parsed.grid_params && typeof parsed.grid_params === "object";

  if (!hasDCA && !hasGrid) {
    throw new Error("AI response missing both dca_params and grid_params");
  }

  // Safety clamp: enforce exchange minimums regardless of what the AI returns.
  // Uses 1.5× safety margin to match the bot engine's skip-order threshold.
  // max(minQuoteAmount, minBaseAmount × lastPrice) gives the effective USDC minimum.
  const effectiveMinUsdc = Math.ceil(
    Math.max(market.minQuoteAmount, market.minBaseAmount * market.lastPrice) * 1.5 * 100
  ) / 100;

  const clampAmount = (raw: number | undefined, fallback: number): number =>
    Math.max(raw ?? fallback, effectiveMinUsdc);

  return {
    strategy: hasDCA ? "dca" : "grid",
    dca_params: hasDCA ? {
      amountPerOrder: clampAmount(parsed.dca_params.amountPerOrder, 100),
      intervalMinutes: parsed.dca_params.intervalMinutes ?? 60,
      side: parsed.dca_params.side ?? "buy",
      orderType: parsed.dca_params.orderType ?? "limit",
      limitPriceOffset: parsed.dca_params.limitPriceOffset ?? 0.2,
    } : null,
    grid_params: hasGrid ? {
      lowerPrice: parsed.grid_params.lowerPrice ?? market.lastPrice * 0.95,
      upperPrice: parsed.grid_params.upperPrice ?? market.lastPrice * 1.05,
      gridLevels: parsed.grid_params.gridLevels ?? 10,
      amountPerGrid: clampAmount(parsed.grid_params.amountPerGrid, 100),
      mode: parsed.grid_params.mode ?? "neutral",
      orderType: parsed.grid_params.orderType ?? "post_only",
      limitPriceOffset: parsed.grid_params.limitPriceOffset ?? 0.1,
      stopLoss: parsed.grid_params.stopLoss ?? null,
      takeProfit: parsed.grid_params.takeProfit ?? null,
    } : null,
    reasoning: parsed.reasoning ?? "Analysis complete.",
    marketCondition: parsed.marketCondition ?? "sideways",
    riskLevel: parsed.riskLevel ?? "medium",
    volumeContext: parsed.volumeContext ?? "normal",
    confidence: parsed.confidence ?? 70,
    modelUsed,
    modelTier: tierDescription,
  };
}