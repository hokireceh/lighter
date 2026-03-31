import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  LineChart, 
  Bot, 
  History, 
  Settings, 
  Terminal,
  TrendingUp,
  LogOut,
  User,
  Sparkles
} from "lucide-react";
import { useGetBotConfig } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: config } = useGetBotConfig();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/markets", label: "Pasar", icon: LineChart },
    { href: "/strategies", label: "Strategi", icon: Bot },
    { href: "/trades", label: "Trade", icon: History },
    { href: "/logs", label: "Log", icon: Terminal },
    { href: "/ai-advisor", label: "AI Advisor", icon: Sparkles },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  const isConfigured = config?.hasPrivateKey && config?.accountIndex !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-60 border-b md:border-r border-border bg-card/50 flex flex-col z-10 shrink-0">

        {/* ── Brand ────────────────────────────────────── */}
        <div className="px-4 py-3 md:px-5 md:pt-5 md:pb-4 md:border-b md:border-border/40">
          {/* Logo row */}
          <div className="flex items-center gap-3">
            {/* Icon — teal solid, distinctive */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #0fd4aa 0%, #0aaa88 100%)" }}>
              <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>

            {/* Brand text */}
            <div className="leading-none min-w-0">
              <div className="font-bold text-[15px] tracking-tight text-foreground">
                Hokireceh
              </div>
              <div className="hidden md:block text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-[3px]">
                Projects
              </div>
            </div>
          </div>

          {/* Active DEX badge — desktop only */}
          <div className="hidden md:inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md
            bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-400 leading-none">Lighter DEX</span>
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────── */}
        <nav className="flex-1 px-2 md:px-3 py-1 md:py-3 overflow-x-auto md:overflow-visible flex md:flex-col md:space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col md:flex-row items-center md:items-center gap-0.5 md:gap-2.5
                  px-2.5 md:px-3 py-2 md:py-2 rounded-lg text-xs md:text-[13px] font-medium transition-all duration-150
                  min-w-[52px] md:min-w-0 shrink-0
                  ${isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"}
                `}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                <span className="leading-tight text-center md:text-left">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Status / User — desktop only ─────────────── */}
        <div className="p-3 md:p-4 mt-auto hidden md:block space-y-2.5">
          {user && (
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {user.telegramName || user.telegramUsername || "User"}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Paket</span>
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  {user.isAdmin ? "Admin" : user.plan}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Kadaluarsa</span>
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  {user.isAdmin || !user.expiresAt
                    ? "Lifetime"
                    : new Date(user.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground hover:text-destructive" onClick={logout}>
                <LogOut className="w-3 h-3 mr-1" /> Keluar
              </Button>
            </div>
          )}

          <div className="bg-background rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Jaringan</span>
              <span className="text-[11px] font-mono text-foreground">{config?.network || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Status</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                <span className={`text-[11px] font-medium ${isConfigured ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {isConfigured ? "Ready" : "Setup"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-[100px] pointer-events-none" />

        {!isConfigured && location !== "/settings" && (
          <div className="bg-warning/10 border-b border-warning/20 px-6 py-3 flex items-center justify-center gap-2 backdrop-blur-md z-20">
            <span className="text-warning text-sm font-medium">API Key belum dikonfigurasi. Mode paper trading atau fitur terbatas.</span>
            <Link href="/settings" className="text-xs bg-warning/20 hover:bg-warning/30 text-warning px-2 py-1 rounded transition-colors">
              Buka Pengaturan
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
