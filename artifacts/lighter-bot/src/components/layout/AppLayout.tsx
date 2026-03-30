import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  LineChart, 
  Bot, 
  History, 
  Settings, 
  Terminal,
  Layers,
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
      <aside className="w-full md:w-64 border-b md:border-r border-border bg-card/50 flex flex-col z-10 shrink-0">
        <div className="px-4 py-3 md:px-5 md:py-4 flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_16px_rgba(var(--primary),0.45)] shrink-0">
            <Layers className="w-4 h-4 md:w-[18px] md:h-[18px] text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-bold text-sm md:text-[15px] tracking-tight text-foreground whitespace-nowrap">
              Hokireceh
            </span>
            <span className="text-[10px] md:text-[11px] font-semibold tracking-[0.18em] text-primary uppercase mt-0.5">
              .projects
            </span>
          </div>
        </div>

        <nav className="flex-1 px-2 md:px-4 py-1 md:py-2 overflow-x-auto md:overflow-visible flex md:flex-col md:space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col md:flex-row items-center md:items-center gap-0.5 md:gap-3
                  px-2.5 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200
                  min-w-[56px] md:min-w-0 shrink-0
                  ${isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"}
                `}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                <span className="leading-tight text-center md:text-left">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status Indicator */}
        <div className="p-4 mt-auto hidden md:block space-y-3">
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
          <div className="bg-background rounded-xl p-4 border border-border shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConfigured ? 'bg-success' : 'bg-warning'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConfigured ? 'bg-success' : 'bg-warning'}`}></span>
                </span>
                <span className={`text-xs font-medium ${isConfigured ? 'text-success' : 'text-warning'}`}>
                  {isConfigured ? "Siap" : "Perlu Konfigurasi"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Jaringan</span>
              <span className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                {config?.network || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Decorative background effects */}
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
