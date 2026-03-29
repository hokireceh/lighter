import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCreateStrategy, useGetOrderBooks } from "@workspace/api-client-react";
import { Plus, Loader2, ChevronsUpDown, Check, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const dcaSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  marketIndex: z.coerce.number({ required_error: "Please select a market" }),
  amountPerOrder: z.coerce.number().positive("Amount must be positive"),
  intervalMinutes: z.coerce.number().min(1, "Interval must be at least 1 minute"),
  side: z.enum(["buy", "sell"]),
  orderType: z.enum(["market", "limit"]),
  limitPriceOffset: z.coerce.number().min(0).optional(),
});

const optionalPositiveNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  },
  z.number().positive("Must be a positive number").optional()
);

const gridSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  marketIndex: z.coerce.number({ required_error: "Please select a market" }),
  lowerPrice: z.coerce.number().positive("Lower price must be positive"),
  upperPrice: z.coerce.number().positive("Upper price must be positive"),
  gridLevels: z.coerce.number().min(2).max(100),
  amountPerGrid: z.coerce.number().positive("Amount must be positive"),
  mode: z.enum(["neutral", "long", "short"]),
  orderType: z.enum(["market", "limit"]),
  limitPriceOffset: z.coerce.number().min(0).optional(),
  stopLoss: optionalPositiveNumber,
  takeProfit: optionalPositiveNumber,
}).refine(data => data.upperPrice > data.lowerPrice, {
  message: "Upper price must be greater than lower price",
  path: ["upperPrice"],
});

type DcaFormData = z.infer<typeof dcaSchema>;
type GridFormData = z.infer<typeof gridSchema>;

interface MarketPickerProps {
  selectedMarket: { index: number; label: string } | null;
  onSelect: (m: { index: number; label: string }) => void;
  error?: string;
  markets: Array<{ index: number; symbol: string; type: string }>;
}

function MarketPicker({ selectedMarket, onSelect, error, markets }: MarketPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Label>Market</Label>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background font-normal"
          >
            {selectedMarket ? (
              <span className="font-mono text-sm">{selectedMarket.label}</span>
            ) : (
              <span className="text-muted-foreground">Search market (e.g. BTC, ETH)...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 z-[200]" align="start">
          <Command>
            <CommandInput placeholder="Search market..." />
            <CommandList className="max-h-[240px] overflow-y-auto">
              <CommandEmpty>No market found.</CommandEmpty>
              <CommandGroup>
                {markets.map(m => {
                  const label = `${m.symbol} (${m.type})`;
                  return (
                    <CommandItem
                      key={m.index}
                      value={label}
                      onSelect={() => {
                        onSelect({ index: m.index, label });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", selectedMarket?.index === m.index ? "opacity-100" : "opacity-0")}
                      />
                      <span className="font-mono text-sm">{m.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize">{m.type}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface AIResult {
  reasoning: string;
  marketCondition: "bullish" | "bearish" | "sideways" | "volatile";
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  modelUsed: string;
  modelTier: string;
}

function AIInsightCard({ result }: { result: AIResult }) {
  const conditionIcon = {
    bullish: <TrendingUp className="w-3.5 h-3.5 text-success" />,
    bearish: <TrendingDown className="w-3.5 h-3.5 text-destructive" />,
    sideways: <Minus className="w-3.5 h-3.5 text-warning" />,
    volatile: <Sparkles className="w-3.5 h-3.5 text-primary" />,
  }[result.marketCondition];

  const riskColor = {
    low: "text-success",
    medium: "text-warning",
    high: "text-destructive",
  }[result.riskLevel];

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          AI Analysis — {result.modelTier}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {conditionIcon}
            <span className="capitalize">{result.marketCondition}</span>
          </div>
          <Badge variant="outline" className={cn("text-xs px-1.5 py-0", riskColor)}>
            {result.riskLevel} risk
          </Badge>
          <span className="text-xs text-muted-foreground">{result.confidence}% confidence</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{result.reasoning}</p>
    </div>
  );
}

async function fetchAIAnalysis(strategyType: "dca" | "grid", marketIndex: number) {
  const token = localStorage.getItem("lb_token") ?? "";
  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ strategyType, marketIndex }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "AI request failed" }));
    throw new Error(err.error ?? "AI request failed");
  }
  return res.json();
}

interface DcaFormProps {
  markets: Array<{ index: number; symbol: string; type: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

function DcaForm({ markets, onSuccess, onCancel }: DcaFormProps) {
  const { toast } = useToast();
  const [selectedMarket, setSelectedMarket] = useState<{ index: number; label: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const form = useForm<DcaFormData>({
    resolver: zodResolver(dcaSchema),
    defaultValues: { side: "buy", orderType: "market", limitPriceOffset: 0 },
  });

  const watchOrderType = form.watch("orderType");

  const createMutation = useCreateStrategy({
    mutation: {
      onSuccess: () => {
        toast({ title: "Strategy Created", description: "Your DCA bot is ready." });
        onSuccess();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to create strategy", variant: "destructive" });
      },
    },
  });

  const handleAIAnalyze = async () => {
    if (!selectedMarket) {
      toast({ title: "Select a market first", description: "Choose a market before running AI analysis.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await fetchAIAnalysis("dca", selectedMarket.index);
      const rec = data.dca_params;
      if (!rec) throw new Error("AI did not return DCA parameters");
      if (rec.amountPerOrder) form.setValue("amountPerOrder", rec.amountPerOrder);
      if (rec.intervalMinutes) form.setValue("intervalMinutes", rec.intervalMinutes);
      if (rec.side) form.setValue("side", rec.side);
      if (rec.orderType) form.setValue("orderType", rec.orderType);
      if (rec.limitPriceOffset !== undefined) form.setValue("limitPriceOffset", rec.limitPriceOffset);
      setAiResult({ reasoning: data.reasoning, marketCondition: data.marketCondition, riskLevel: data.riskLevel, confidence: data.confidence, modelUsed: data.modelUsed, modelTier: data.modelTier });
      toast({ title: "AI Analysis Complete", description: `Parameters auto-filled using ${data.modelTier}` });
    } catch (err: any) {
      toast({ title: "AI Analysis Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = (data: DcaFormData) => {
    createMutation.mutate({
      data: {
        name: data.name,
        type: "dca",
        marketIndex: data.marketIndex,
        dcaConfig: {
          amountPerOrder: data.amountPerOrder,
          intervalMinutes: data.intervalMinutes,
          side: data.side,
          orderType: data.orderType,
          limitPriceOffset: data.orderType === "limit" ? (data.limitPriceOffset ?? 0) : 0,
        },
      },
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label>Strategy Name</Label>
        <Input {...form.register("name")} placeholder="e.g. ETH Weekly Accumulation" className="bg-background" />
        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
      </div>

      <MarketPicker
        markets={markets}
        selectedMarket={selectedMarket}
        onSelect={(m) => { setSelectedMarket(m); form.setValue("marketIndex", m.index, { shouldValidate: true }); setAiResult(null); }}
        error={form.formState.errors.marketIndex?.message}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full border-primary/40 text-primary hover:bg-primary/10 gap-2"
        onClick={handleAIAnalyze}
        disabled={aiLoading}
      >
        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {aiLoading ? "Analyzing market..." : "AI Auto-Fill Parameters"}
      </Button>

      {aiResult && <AIInsightCard result={aiResult} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount (USDC)</Label>
          <Input type="number" step="0.01" {...form.register("amountPerOrder")} placeholder="100" className="bg-background font-mono" />
          {form.formState.errors.amountPerOrder && <p className="text-xs text-destructive">{form.formState.errors.amountPerOrder.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Interval (Minutes)</Label>
          <Input type="number" {...form.register("intervalMinutes")} placeholder="1440" className="bg-background font-mono" />
          {form.formState.errors.intervalMinutes && <p className="text-xs text-destructive">{form.formState.errors.intervalMinutes.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Side</Label>
          <Select onValueChange={(v: any) => form.setValue("side", v)} value={form.watch("side") || "buy"}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select onValueChange={(v: any) => form.setValue("orderType", v)} value={form.watch("orderType") || "market"}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market (Taker)</SelectItem>
              <SelectItem value="limit">Limit (Maker)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {watchOrderType === "limit" && (
        <div className="space-y-2">
          <Label>
            Limit Price Offset (USDC)
            <span className="ml-1.5 text-xs text-muted-foreground">— how far from market price to place limit order</span>
          </Label>
          <Input type="number" step="0.01" {...form.register("limitPriceOffset")} placeholder="e.g. 10" className="bg-background font-mono" />
          <p className="text-xs text-muted-foreground">
            Buy: places order <strong>below</strong> market price by this amount. Sell: places <strong>above</strong>.
          </p>
          {form.formState.errors.limitPriceOffset && <p className="text-xs text-destructive">{form.formState.errors.limitPriceOffset.message}</p>}
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Bot
        </Button>
      </div>
    </form>
  );
}

interface GridFormProps {
  markets: Array<{ index: number; symbol: string; type: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

function GridForm({ markets, onSuccess, onCancel }: GridFormProps) {
  const { toast } = useToast();
  const [selectedMarket, setSelectedMarket] = useState<{ index: number; label: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const form = useForm<GridFormData>({
    resolver: zodResolver(gridSchema),
    defaultValues: { mode: "neutral", orderType: "limit", limitPriceOffset: 0 },
  });

  const watchOrderType = form.watch("orderType");

  const createMutation = useCreateStrategy({
    mutation: {
      onSuccess: () => {
        toast({ title: "Strategy Created", description: "Your Grid bot is ready." });
        onSuccess();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to create strategy", variant: "destructive" });
      },
    },
  });

  const handleAIAnalyze = async () => {
    if (!selectedMarket) {
      toast({ title: "Select a market first", description: "Choose a market before running AI analysis.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await fetchAIAnalysis("grid", selectedMarket.index);
      const rec = data.grid_params;
      if (!rec) throw new Error("AI did not return Grid parameters");
      if (rec.lowerPrice) form.setValue("lowerPrice", rec.lowerPrice);
      if (rec.upperPrice) form.setValue("upperPrice", rec.upperPrice);
      if (rec.gridLevels) form.setValue("gridLevels", rec.gridLevels);
      if (rec.amountPerGrid) form.setValue("amountPerGrid", rec.amountPerGrid);
      if (rec.mode) form.setValue("mode", rec.mode);
      if (rec.orderType) form.setValue("orderType", rec.orderType);
      if (rec.limitPriceOffset !== undefined) form.setValue("limitPriceOffset", rec.limitPriceOffset);
      if (rec.stopLoss) form.setValue("stopLoss", rec.stopLoss);
      if (rec.takeProfit) form.setValue("takeProfit", rec.takeProfit);
      setAiResult({ reasoning: data.reasoning, marketCondition: data.marketCondition, riskLevel: data.riskLevel, confidence: data.confidence, modelUsed: data.modelUsed, modelTier: data.modelTier });
      toast({ title: "AI Analysis Complete", description: `Grid parameters auto-filled using ${data.modelTier}` });
    } catch (err: any) {
      toast({ title: "AI Analysis Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = (data: GridFormData) => {
    createMutation.mutate({
      data: {
        name: data.name,
        type: "grid",
        marketIndex: data.marketIndex,
        gridConfig: {
          lowerPrice: data.lowerPrice,
          upperPrice: data.upperPrice,
          gridLevels: data.gridLevels,
          amountPerGrid: data.amountPerGrid,
          mode: data.mode,
          orderType: data.orderType,
          limitPriceOffset: data.orderType === "limit" ? (data.limitPriceOffset ?? 0) : 0,
          stopLoss: data.stopLoss || null,
          takeProfit: data.takeProfit || null,
        },
      },
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label>Strategy Name</Label>
        <Input {...form.register("name")} placeholder="e.g. BTC Grid Neutral" className="bg-background" />
        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
      </div>

      <MarketPicker
        markets={markets}
        selectedMarket={selectedMarket}
        onSelect={(m) => { setSelectedMarket(m); form.setValue("marketIndex", m.index, { shouldValidate: true }); setAiResult(null); }}
        error={form.formState.errors.marketIndex?.message}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full border-primary/40 text-primary hover:bg-primary/10 gap-2"
        onClick={handleAIAnalyze}
        disabled={aiLoading}
      >
        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {aiLoading ? "Analyzing market for grid setup..." : "AI Auto-Fill Grid Parameters"}
      </Button>

      {aiResult && <AIInsightCard result={aiResult} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Lower Price</Label>
          <Input type="number" step="0.01" {...form.register("lowerPrice")} placeholder="1800" className="bg-background font-mono" />
          {form.formState.errors.lowerPrice && <p className="text-xs text-destructive">{form.formState.errors.lowerPrice.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Upper Price</Label>
          <Input type="number" step="0.01" {...form.register("upperPrice")} placeholder="2200" className="bg-background font-mono" />
          {form.formState.errors.upperPrice && <p className="text-xs text-destructive">{form.formState.errors.upperPrice.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Grid Levels</Label>
          <Input type="number" {...form.register("gridLevels")} placeholder="10" className="bg-background font-mono" />
          {form.formState.errors.gridLevels && <p className="text-xs text-destructive">{form.formState.errors.gridLevels.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Amount per Grid (USDC)</Label>
          <Input type="number" step="0.01" {...form.register("amountPerGrid")} placeholder="50" className="bg-background font-mono" />
          {form.formState.errors.amountPerGrid && <p className="text-xs text-destructive">{form.formState.errors.amountPerGrid.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select onValueChange={(v: any) => form.setValue("mode", v)} value={form.watch("mode") || "neutral"}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">Neutral (Both)</SelectItem>
              <SelectItem value="long">Long (Buy only)</SelectItem>
              <SelectItem value="short">Short (Sell only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select onValueChange={(v: any) => form.setValue("orderType", v)} value={form.watch("orderType") || "limit"}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="limit">Limit (Maker) ⭐</SelectItem>
              <SelectItem value="market">Market (Taker)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {watchOrderType === "limit" && (
        <div className="space-y-2">
          <Label>
            Limit Price Offset (USDC)
            <span className="ml-1.5 text-xs text-muted-foreground">— offset from crossing price</span>
          </Label>
          <Input type="number" step="0.01" {...form.register("limitPriceOffset")} placeholder="e.g. 5" className="bg-background font-mono" />
          <p className="text-xs text-muted-foreground">
            Grid buy: places <strong>below</strong> crossing price. Grid sell: places <strong>above</strong>. Set 0 for exact grid level price.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stop Loss <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input type="number" step="0.01" {...form.register("stopLoss")} placeholder="e.g. 1700" className="bg-background font-mono" />
          <p className="text-xs text-muted-foreground">Bot stops if price drops below this</p>
        </div>
        <div className="space-y-2">
          <Label>Take Profit <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input type="number" step="0.01" {...form.register("takeProfit")} placeholder="e.g. 2500" className="bg-background font-mono" />
          <p className="text-xs text-muted-foreground">Bot stops if price rises above this</p>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Bot
        </Button>
      </div>
    </form>
  );
}

export function CreateStrategyModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"dca" | "grid">("dca");
  const { data: marketsData } = useGetOrderBooks();
  const markets = marketsData?.markets ?? [];

  const handleSuccess = () => {
    setOpen(false);
    setTab("dca");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
          <Plus className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Trading Bot</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-background border border-border">
            <TabsTrigger value="dca">DCA Bot</TabsTrigger>
            <TabsTrigger value="grid">Grid Bot</TabsTrigger>
          </TabsList>

          <TabsContent value="dca">
            <DcaForm markets={markets} onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
          </TabsContent>

          <TabsContent value="grid">
            <GridForm markets={markets} onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
