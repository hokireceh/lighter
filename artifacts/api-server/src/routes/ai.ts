import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { getMarketInfo } from "../lib/marketCache";
import { analyzeMarketForStrategy } from "../lib/groqAI";

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
    const market = await getMarketInfo(Number(marketIndex));
    if (!market) {
      return res.status(404).json({ error: "Market not found" });
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
    });

    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "AI analysis failed");
    const msg = err?.message ?? "AI analysis failed";
    const isConfig = msg.includes("GROQ_API_KEY");
    res.status(isConfig ? 503 : 502).json({ error: msg });
  }
});

export default router;
