import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Bot,
  History,
  Settings,
  Terminal,
  TrendingUp,
  LogOut,
  User,
  Sparkles,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useGetBotConfig } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategi", icon: Bot },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const secondaryNav = [
  { href: "/trades", label: "Trade", icon: History },
  { href: "/logs", label: "Log", icon: Terminal },
  { href: "/ai-advisor", label: "AI Advisor", icon: Sparkles },
];

const allNav = [...primaryNav, ...secondaryNav];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: config } = useGetBotConfig();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isConfigured = config?.hasPrivateKey && config?.accountIndex !== null;
  const isSecondaryActive = secondaryNav.some((item) => location === item.href);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 border-r border-border bg-card/50 flex-col z-10 shrink-0">

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Hokireceh"
              className="w-8 h-8 rounded-xl object-contain shrink-0"
            />
            <div className="leading-none min-w-0">
              <div className="font-bold text-[15px] tracking-tight text-foreground">Hokireceh</div>
              <div className="text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-[3px]">
                Projects
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-400 leading-none">Lighter DEX</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {allNav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-150 border
                  ${isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent"}
                `}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Status */}
        <div className="p-4 mt-auto space-y-2.5">
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
              <Button
                variant="ghost" size="sm"
                className="w-full h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="w-3 h-3 mr-1" /> Keluar
              </Button>
            </div>
          )}

          <div className="bg-background rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Jaringan</span>
              <span className="text-[11px] font-mono text-foreground">{config?.network || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Status</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? "bg-emerald-400" : "bg-yellow-400"}`} />
                <span className={`text-[11px] font-medium ${isConfigured ? "text-emerald-400" : "text-yellow-400"}`}>
                  {isConfigured ? "Ready" : "Setup"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ──────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Hokireceh" className="w-7 h-7 rounded-lg object-contain" />
          <div className="leading-none">
            <div className="font-bold text-[14px] tracking-tight text-foreground">Hokireceh</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400">Lighter DEX</span>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-[100px] pointer-events-none" />

        {!isConfigured && location !== "/settings" && (
          <div className="border-b border-border/50 px-4 py-1.5 flex items-center justify-center gap-2 z-20">
            <span className="text-muted-foreground text-xs">API Key belum dikonfigurasi.</span>
            <Link href="/settings" className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">
              Buka Pengaturan →
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 pb-[72px] md:pb-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-stretch h-14">
          {primaryNav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-0.5
                  transition-colors duration-150
                  ${isActive ? "text-emerald-400" : "text-muted-foreground"}
                `}
              >
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}

          {/* Lainnya button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5
              transition-colors duration-150
              ${isSecondaryActive ? "text-emerald-400" : "text-muted-foreground"}
            `}
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={isSecondaryActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile "Lainnya" Sheet ──────────────────────────────────── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-card border-t border-border rounded-t-2xl p-4 pb-8 z-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Menu Lainnya</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {secondaryNav.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`
                      flex flex-col items-center gap-2 py-4 rounded-xl border
                      transition-all duration-150
                      ${isActive
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
