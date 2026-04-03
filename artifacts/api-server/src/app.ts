import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { strategiesTable, botLogsTable } from "@workspace/db";
import { sql, isNull } from "drizzle-orm";
import { restoreRunningBots, startLogCleanupSchedule, startTradePollSchedule } from "./lib/botEngine";
import { startTelegramBot } from "./lib/telegramBot";

const app: Express = express();

// ─── Reverse Proxy Trust ──────────────────────────────────────────────────────
// Required when running behind Nginx / Caddy / Replit proxy.
// Without this, express-rate-limit cannot read the real client IP from
// X-Forwarded-For and throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss://mainnet.zklighter.elliot.ai", "wss://testnet.zklighter.elliot.ai", "https://mainnet.zklighter.elliot.ai", "https://testnet.zklighter.elliot.ai"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// Auth endpoints: 10 attempts per 15 minutes per IP (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." },
});

// General API: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/health"),
  message: { error: "Rate limit exceeded. Silakan tunggu sebentar." },
});

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiters
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use("/api", router);

// ─── Auto DB Migration: add password_hash column if missing ──────────────────
// Ensures VPS deployments work without requiring a manual `pnpm db:push`.
db.execute(sql`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text
`).then(() => {
  logger.info("DB migration: password_hash column ensured");
}).catch((err) => {
  logger.warn({ err }, "DB migration: could not add password_hash column (may already exist)");
});

// Fix any null user_ids left from old code (admin = userId 0, falsy in JS)
async function fixNullUserIds() {
  try {
    const fixedStrats = await db.update(strategiesTable)
      .set({ userId: 0 })
      .where(isNull(strategiesTable.userId));
    const fixedLogs = await db.update(botLogsTable)
      .set({ userId: 0 })
      .where(isNull(botLogsTable.userId));
    logger.info({ fixedStrats: fixedStrats.rowCount ?? 0, fixedLogs: fixedLogs.rowCount ?? 0 }, "Startup DB fix: null user_id → 0");
  } catch (err) {
    logger.warn({ err }, "Startup DB fix failed (non-critical)");
  }
}

// Restore bots after startup, then start trade polling after DB health-check
setTimeout(async () => {
  await fixNullUserIds();
  restoreRunningBots().catch((err) => {
    logger.error({ err }, "Failed to restore running bots");
  });

  // DB health-check: verify trades table exists before starting poller
  // If table is not ready yet, 42P01 guard in pollPendingTrades() handles each cycle
  try {
    await db.execute(sql`SELECT 1 FROM trades LIMIT 1`);
    logger.info("DB health-check passed: trades table ready");
  } catch (err) {
    const pgCode = (err as any)?.cause?.code ?? (err as any)?.code;
    if (pgCode === "42P01") {
      logger.warn("DB health-check: trades table not yet available — poller will skip cycles until migration completes");
    } else {
      logger.warn({ err }, "DB health-check: unexpected error — poller starting anyway");
    }
  }
  startTradePollSchedule();
}, 3000);

// Start log cleanup schedule (runs daily, keeps last 30 days)
startLogCleanupSchedule();

// Start Telegram bot
setTimeout(() => {
  try {
    startTelegramBot();
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
  }
}, 1000);

export default app;
