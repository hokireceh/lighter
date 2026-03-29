import { useState } from "react";
import { useGetTradeHistory, getGetTradeHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, ExternalLink } from "lucide-react";
import { formatWIBDateTime } from "@/lib/utils";

export default function Trades() {
  const [limit, setLimit] = useState(50);
  const { data, isLoading } = useGetTradeHistory({ limit }, { query: { queryKey: getGetTradeHistoryQueryKey({ limit }), refetchInterval: 10000 } });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <History className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Trade History
          </h1>
          <p className="text-muted-foreground mt-1">Complete log of executed and pending orders</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
            <SelectTrigger className="w-24 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Card className="glass-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[130px] sm:w-[180px]">Time</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead className="hidden sm:table-cell">Strategy</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Size</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell><div className="h-4 w-24 sm:w-32 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell className="text-right"><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      <TableCell className="text-right hidden sm:table-cell"><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      <TableCell className="text-right"><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !data?.trades.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No trades found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.trades.map((trade) => (
                    <TableRow key={trade.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatWIBDateTime(trade.executedAt || trade.createdAt)}
                      </TableCell>
                      <TableCell className="font-bold text-foreground text-sm">
                        {trade.marketSymbol}
                      </TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">
                        {trade.strategyName}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          trade.side === 'buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs sm:text-sm">
                        {(trade.price ?? 0) > 0 ? `$${Number(trade.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : 'MKT'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs sm:text-sm hidden sm:table-cell">
                        {Number(trade.size).toFixed(6)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-xs font-medium ${
                            trade.status === 'filled' ? 'text-success' :
                            trade.status === 'failed' || trade.status === 'cancelled' ? 'text-destructive' :
                            'text-warning'
                          }`}>
                            {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                          </span>
                          {trade.orderHash && (
                            <a href={`https://app.lighter.xyz/explorer/logs/${trade.orderHash}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
