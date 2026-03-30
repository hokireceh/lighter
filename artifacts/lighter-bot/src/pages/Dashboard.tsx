import { 
  useGetAccountInfo, 
  useGetStrategies, 
  useGetBotLogs 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { Wallet, Activity, ArrowRightLeft, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatWIBTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: account, isLoading: loadingAccount } = useGetAccountInfo();
  const { data: strategiesData, isLoading: loadingStrategies } = useGetStrategies();
  const { data: logsData, isLoading: loadingLogs } = useGetBotLogs({ limit: 5 });

  const activeStrategies = strategiesData?.strategies?.filter(s => s.isActive) || [];
  const runningStrategies = strategiesData?.strategies?.filter(s => s.isRunning) || [];

  const expiresAt = user?.expiresAt ? new Date(user.expiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Ringkasan aktivitas trading Lighter kamu</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel hover:-translate-y-1 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ekuitas</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingAccount ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <PriceDisplay 
                value={account?.totalEquity || 0} 
                format="currency" 
                colored={false} 
                className="text-2xl font-bold text-foreground" 
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">Tersedia: ${account?.availableBalance?.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:-translate-y-1 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bot Aktif</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStrategies ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground font-mono">
                {runningStrategies.length} <span className="text-muted-foreground text-sm font-sans font-normal">/ {activeStrategies.length}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Strategi dikonfigurasi</p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:-translate-y-1 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posisi Terbuka</CardTitle>
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingAccount ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground font-mono">
                {account?.positions?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Di semua pasar</p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:-translate-y-1 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PnL Belum Terealisasi</CardTitle>
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingAccount ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <PriceDisplay 
                value={account?.positions?.reduce((acc, p) => acc + (p.unrealizedPnl || 0), 0) || 0} 
                format="currency" 
                showIcon 
                className="text-2xl font-bold" 
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">Dari posisi terbuka</p>
          </CardContent>
        </Card>
      </div>

      {user && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm border ${
          isExpired
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : isExpiringSoon
            ? "bg-warning/10 border-warning/30 text-warning"
            : "bg-success/10 border-success/30 text-success"
        }`}>
          <Clock className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">
              {isExpired ? "Langganan Habis" : `Langganan aktif — paket ${user.plan}`}
            </span>
            {expiresAt && (
              <span className="ml-2 font-normal opacity-80">
                {isExpired
                  ? `Kadaluarsa ${expiresAt.toLocaleDateString("id-ID")}`
                  : `Kadaluarsa ${expiresAt.toLocaleDateString("id-ID")} (${daysLeft} hari lagi)`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle>Posisi Terbuka</CardTitle>
            <CardDescription>Eksposur risiko saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAccount ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : !account?.positions?.length ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-20" />
                <p>Tidak ada posisi terbuka.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {account.positions.map((pos, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-bold ${pos.side === 'long' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                        {pos.side.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{pos.marketSymbol}</div>
                        <div className="text-xs text-muted-foreground font-mono">{pos.size} @ ${pos.entryPrice}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <PriceDisplay value={pos.unrealizedPnl} format="currency" showIcon />
                      <div className="text-xs text-muted-foreground font-mono">Mark: ${pos.markPrice}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>Operasi bot terkini</CardDescription>
            </div>
            <Link href="/logs" className="text-sm text-primary hover:text-primary/80">Lihat semua</Link>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : !logsData?.logs.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada aktivitas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logsData.logs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="shrink-0 mt-0.5">
                      {log.level === 'info' && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />}
                      {log.level === 'success' && <div className="w-2 h-2 rounded-full bg-success mt-1" />}
                      {log.level === 'warn' && <div className="w-2 h-2 rounded-full bg-warning mt-1" />}
                      {log.level === 'error' && <div className="w-2 h-2 rounded-full bg-destructive mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-medium text-foreground truncate">{log.strategyName || 'Sistem'}</span>
                        <span className="text-xs text-muted-foreground shrink-0 font-mono">
                          {formatWIBTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">{log.message}</p>
                      {log.details && (
                        <p className="text-muted-foreground/60 text-xs mt-0.5 truncate">{log.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
