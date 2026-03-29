import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { restoreRunningBots, startLogCleanupSchedule, startTradePollSchedule } from "./lib/botEngine";
import { startTelegramBot } from "./lib/telegramBot";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Restore bots after startup
setTimeout(() => {
  restoreRunningBots().catch((err) => {
    logger.error({ err }, "Failed to restore running bots");
  });
}, 3000);

// Start log cleanup schedule (runs daily, keeps last 30 days)
startLogCleanupSchedule();

// Poll pending trades for status updates every 15 seconds
startTradePollSchedule();

// Start Telegram bot
setTimeout(() => {
  try {
    startTelegramBot();
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
  }
}, 1000);

export default app;
