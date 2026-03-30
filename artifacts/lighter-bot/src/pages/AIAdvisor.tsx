import { useState } from "react";
import { useGetOrderBooks } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  AlertTriangle,
  Shield,
  Target,
  Bot,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { Link } from "wouter";

type StrategyType = "dca" | "grid";

type MarketCondition = "bullish" | "bearish" | "sideways" | "volatile";
type RiskLevel = "low" | "medium" | "high";

interface AIResult {
  strategy: StrategyType;
  dca_params: {
    amountPerOrder: number;
    intervalMinutes: number;
    side: "buy" | "sell";
    orderType: string;
    limitPriceOffset: number;
  } | null;
  grid_params: {
    lowerPrice: number;
    upperPrice: number;
    gridLevels: number;
    amountPerGrid: number;
    mode: string;
    orderType: string;
    limitPriceOffset: number;
    stopLoss: number | null;
    takeProfit: number | null;
  } | null;
  reasoning: string;
  marketCondition: MarketCondition;
  riskLevel: RiskLevel;
  volumeContext: "low" | "normal" | "high";
  confidence: number;
  availableBalance?: number;
  modelUsed: string;
  modelTier: string;
}

const conditionConfig: Record<MarketCondition, { label: string; color: string; Icon: typeof TrendingUp }> = {
  bullish: { label: "Bullish", color: "text-success", Icon: TrendingUp },
  bearish: { label: "Bearish", color: "text-destructive", Icon: TrendingDown },
  sideways: { label: "Sideways", color: "text-blue-400", Icon: Minus },
  volatile: { label: "Volatile", color: "text-warning", Icon: Zap },
};

const riskConfig: Record<RiskLevel, { label: string; color: string; Icon: typeof Shield }> = {
  low: { label: "Risiko Rendah", color: "text-success", Icon: Shield },
  medium: { label: "Risiko Sedang", color: "text-warning", Icon: AlertTriangle },
  high: { label: "Risiko Tinggi", color: "text-destructive", Icon: Target },
};

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Keyakinan</span>
        <span className="font-mono font-bold text-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function AIAdvisor() {
  const { data: marketsData } = useGetOrderBooks();
  const markets = marketsData?.markets ?? [];

  const [selectedMarketIndex, setSelectedMarketIndex] = useState<string>("");
  const [strategyType, setStrategyType] = useState<StrategyType>("grid");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedMarket = markets.find(m => m.index === Number(selectedMarketIndex));

  const handleAnalyze = async () => {
    if (!selectedMarketIndex) return;
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ strategyType, marketIndex: Number(selectedMarketIndex) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) {
          throw new Error("GROQ_API_KEY belum dikonfigurasi. Tambahkan di environment variables server.");
        }
        throw new Error(data.error ?? "Analisis AI gagal");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cond = result ? conditionConfig[result.marketCondition] : null;
  const risk = result ? riskConfig[result.riskLevel] : null;

  const strategyQuery = result
    ? `?type=${result.strategy}&market=${selectedMarketIndex}`
    : "";

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          AI Advisor
        </h1>
        <p className="text-muted-foreground mt-1">Rekomendasi parameter strategi berbasis analisis pasar real-time</p>
      </header>

      {/* Input Card */}
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            Pilih Pasar & Strategi
          </CardTitle>
          <CardDescription>AI akan menganalisis kondisi pasar saat ini dan memberikan parameter optimal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Market</label>
              <Select value={selectedMarketIndex} onValueChange={setSelectedMarketIndex}>
                <SelectTrigger className="bg-background border-border/60">
                  <SelectValue placeholder={markets.length === 0 ? "Memuat pasar..." : "Pilih market..."} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {markets.map(m => (
                    <SelectItem key={m.index} value={String(m.index)}>
                      <span className="font-mono">{m.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground uppercase">{m.type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tipe Strategi</label>
              <Select value={strategyType} onValueChange={(v) => setStrategyType(v as StrategyType)}>
                <SelectTrigger className="bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid Trading — Pasar ranging/sideways</SelectItem>
                  <SelectItem value="dca">DCA (Dollar Cost Avg) — Pasar trending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!selectedMarketIndex || isAnalyzing}
            className="w-full sm:w-auto gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analisis Sekarang
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-start gap-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Skeleton while analyzing */}
      {isAnalyzing && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-panel border-border/50">
                <CardContent className="pt-6 space-y-3">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-7 w-28 bg-primary/10 animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="glass-panel border-border/50">
            <CardContent className="pt-6 space-y-3">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4/6 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && cond && risk && !isAnalyzing && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass-panel border-border/50">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Kondisi Pasar</p>
                <div className={`flex items-center gap-2 font-semibold text-lg ${cond.color}`}>
                  <cond.Icon className="w-5 h-5" />
                  {cond.label}
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-border/50">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Tingkat Risiko</p>
                <div className={`flex items-center gap-2 font-semibold text-lg ${risk.color}`}>
                  <risk.Icon className="w-5 h-5" />
                  {risk.label}
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-border/50">
              <CardContent className="pt-5 pb-4 space-y-2">
                <ConfidenceBar value={result.confidence} />
              </CardContent>
            </Card>
          </div>

          {/* Reasoning */}
          <Card className="glass-panel border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Analisis AI
                <Badge variant="outline" className="ml-auto text-xs font-mono">{result.modelTier}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
              {result.availableBalance !== undefined && (
                <p className="text-xs text-muted-foreground mt-3">
                  Balance yang digunakan untuk kalkulasi: <span className="font-mono font-semibold">${result.availableBalance.toFixed(2)} USDC</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card className="glass-panel border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Parameter yang Direkomendasikan
                <Badge className="ml-auto capitalize">{result.strategy === "dca" ? "DCA" : "Grid"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.dca_params && (
                <div>
                  <ParamRow label="Amount per Order" value={`$${result.dca_params.amountPerOrder.toFixed(2)} USDC`} />
                  <ParamRow label="Interval" value={
                    result.dca_params.intervalMinutes >= 60
                      ? `${(result.dca_params.intervalMinutes / 60).toFixed(0)} jam`
                      : `${result.dca_params.intervalMinutes} menit`
                  } />
                  <ParamRow label="Sisi" value={result.dca_params.side === "buy" ? "Buy (Long)" : "Sell (Short)"} />
                  <ParamRow label="Order Type" value={result.dca_params.orderType === "post_only" ? "Post-Only (Maker)" : "Limit"} />
                  <ParamRow label="Price Offset" value={`$${result.dca_params.limitPriceOffset.toFixed(2)}`} />
                </div>
              )}
              {result.grid_params && (
                <div>
                  <ParamRow label="Lower Price" value={`$${result.grid_params.lowerPrice.toFixed(2)}`} />
                  <ParamRow label="Upper Price" value={`$${result.grid_params.upperPrice.toFixed(2)}`} />
                  <ParamRow label="Grid Levels" value={`${result.grid_params.gridLevels} level`} />
                  <ParamRow label="Amount per Grid" value={`$${result.grid_params.amountPerGrid.toFixed(2)} USDC`} />
                  <ParamRow label="Mode" value={result.grid_params.mode.charAt(0).toUpperCase() + result.grid_params.mode.slice(1)} />
                  <ParamRow label="Order Type" value={result.grid_params.orderType === "post_only" ? "Post-Only (Maker)" : "Limit"} />
                  {result.grid_params.stopLoss && (
                    <ParamRow label="Stop Loss" value={`$${result.grid_params.stopLoss.toFixed(2)}`} />
                  )}
                  {result.grid_params.takeProfit && (
                    <ParamRow label="Take Profit" value={`$${result.grid_params.takeProfit.toFixed(2)}`} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/strategies`}>
              <Button className="w-full sm:w-auto gap-2" variant="default">
                <Bot className="w-4 h-4" />
                Buat Strategi Baru
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={() => { setResult(null); setError(null); }}
            >
              Analisis Ulang
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠ Rekomendasi AI bersifat informatif. Selalu evaluasi kondisi pasar secara mandiri sebelum mengaktifkan bot.
          </p>
        </div>
      )}
    </div>
  );
}
