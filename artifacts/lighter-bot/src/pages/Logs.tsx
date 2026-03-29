import { useEffect, useRef } from "react";
import { useGetBotLogs, getGetBotLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { formatWIBDateTime } from "@/lib/utils";

export default function Logs() {
  const { data, isLoading } = useGetBotLogs(
    { limit: 200 },
    { query: { queryKey: getGetBotLogsQueryKey({ limit: 200 }), refetchInterval: 3000 } }
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Detect jika user scroll manual ke atas — jangan paksa scroll balik
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    userScrolledUp.current = !isAtBottom;
  };

  // Backend returns newest-first (DESC), reverse agar terminal-style: terlama di atas, terbaru di bawah
  const logs = data?.logs ? [...data.logs].reverse() : [];

  useEffect(() => {
    if (userScrolledUp.current) return;
    // requestAnimationFrame memastikan DOM sudah selesai paint sebelum scroll
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [logs.length]);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Terminal className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          System Logs
        </h1>
        <p className="text-muted-foreground mt-1">Real-time bot execution and system events</p>
      </header>

      <Card className="glass-panel flex-1 overflow-hidden flex flex-col border-border/50">
        <div className="bg-muted px-4 py-2 border-b border-border/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <div className="w-3 h-3 rounded-full bg-success"></div>
          </div>
          <div className="text-xs font-mono text-muted-foreground">tail -f /var/log/lighter-bot.log</div>
        </div>

        <CardContent className="p-0 flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto bg-black/50 font-mono text-xs sm:text-sm"
          >
            {isLoading ? (
              <div className="p-4 text-muted-foreground animate-pulse">Loading logs...</div>
            ) : !logs.length ? (
              <div className="p-4 text-muted-foreground">No logs available.</div>
            ) : (
              <div className="p-4 space-y-1">
                {logs.map((log) => {
                  let colorClass = "text-muted-foreground";
                  if (log.level === "error") colorClass = "text-destructive font-semibold";
                  if (log.level === "success") colorClass = "text-success";
                  if (log.level === "warn") colorClass = "text-warning";
                  if (log.level === "info") colorClass = "text-blue-400";

                  return (
                    <div
                      key={log.id}
                      className="flex gap-2 sm:gap-4 hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-all"
                    >
                      <span className="text-muted-foreground shrink-0 w-[4.5rem] sm:w-36 truncate">
                        [{formatWIBDateTime(log.createdAt)}]
                      </span>
                      <span className={`shrink-0 w-10 sm:w-16 uppercase ${colorClass}`}>
                        {log.level}
                      </span>
                      <span className="hidden sm:inline-block shrink-0 w-32 text-primary truncate">
                        {log.strategyName || "SYSTEM"}
                      </span>
                      <span className={`flex-1 min-w-0 ${colorClass}`}>
                        {log.message}
                        {log.details && (
                          <span className="block text-muted-foreground font-normal mt-0.5 opacity-75">
                            {log.details}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
