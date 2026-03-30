import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { getMarketInfo } from "../lib/marketCache";
import { analyzeMarketForStrategy } from "../lib/groqAI";
import { getBotConfig } from "./configService";
import { getAccountByIndex } from "../lib/lighterApi";

const router = Router();
router.use(authMiddleware as any);

router.post("/analyze", async (req: AuthRequest, res) => {
  const { strategyType, marketIndex } = req.body as {
    strategyType: "dca" | "grid";
    marketIndex: number;
  };

  if (!strategyType || !["dca", "grid"].includes(strategyType)) {
    return res.status(400).json({ error: "strategyType must be 'dca' or 'grid'" });
  }
  if (marketIndex === undefined || marketIndex === null || isNaN(Number(marketIndex))) {
    return res.status(400).json({ error: "marketIndex is required" });
  }

  try {
    // Ambil market data dan akun user secara paralel
    const [market, config] = await Promise.all([
      getMarketInfo(Number(marketIndex)),
      getBotConfig(req.userId!).catch(() => null),
    ]);

    if (!market) {
      return res.status(404).json({ error: "Market not found" });
    }

    // Ambil available balance realtime dari Lighter
    let availableBalance: number | undefined;
    if (config?.accountIndex) {
      try {
        const accountRaw = await getAccountByIndex(config.accountIndex, config.network);
        const account = accountRaw?.accounts?.[0];
        if (account?.available_balance) {
          availableBalance = parseFloat(account.available_balance);
        }
      } catch {
        // Gagal ambil balance → AI tetap jalan dengan fallback $1000
        req.log.warn("Failed to fetch account balance for AI context, using default");
      }
    }

    const result = await analyzeMarketForStrategy(strategyType, {
      symbol: market.symbol,
      type: market.type,
      lastPrice: market.lastTradePrice,
      high24h: market.dailyHigh,
      low24h: market.dailyLow,
      volume24h: market.dailyVolume,
      priceChangePct24h: market.dailyPriceChange,
      minBaseAmount: market.minBaseAmount,
      minQuoteAmount: market.minQuoteAmount,
      availableBalance,
    });

    res.json({ ...result, availableBalance });
  } catch (err: any) {
    req.log.error({ err }, "AI analysis failed");
    const msg = err?.message ?? "AI analysis failed";
    const isConfig = msg.includes("GROQ_API_KEY");
    res.status(isConfig ? 503 : 502).json({ error: msg });
  }
});

export default router;
