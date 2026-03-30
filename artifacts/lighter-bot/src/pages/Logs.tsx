import { useEffect, useRef, useState } from "react";
import { useGetBotLogs, getGetBotLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Terminal, Copy, Check } from "lucide-react";
import { formatWIBDateTime } from "@/lib/utils";

export default function Logs() {
  const { data, isLoading } = useGetBotLogs(
    { limit: 200 },
    { query: { queryKey: getGetBotLogsQueryKey({ limit: 200 }), refetchInterval: 3000 } }
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const [copied, setCopied] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null);

  const handleCopyAll = () => {
    if (!logs.length) return;
    const text = logs.map((log) => {
      const ts = `[${formatWIBDateTime(log.createdAt)}]`;
      const level = log.level.toUpperCase().padEnd(7);
      const name = (log.strategyName || "SYSTEM").padEnd(20);
      const msg = log.details ? `${log.message}\n  ${log.details}` : log.message;
      return `${ts} ${level} ${name} ${msg}`;
    }).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyRow = (log: typeof logs[0]) => {
    const ts = `[${formatWIBDateTime(log.createdAt)}]`;
    const level = log.level.toUpperCase().padEnd(7);
    const name = (log.strategyName || "SYSTEM").padEnd(20);
    const msg = log.details ? `${log.message}  ${log.details}` : log.message;
    const text = `${ts} ${level} ${name} ${msg}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRowId(log.id);
      setTimeout(() => setCopiedRowId(null), 1500);
    });
  };

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
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-white/10"
            title="Salin semua log"
          >
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Tersalin!" : "Salin semua"}</span>
          </button>
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
                      className="group flex gap-2 sm:gap-4 hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-all cursor-pointer"
                      onClick={() => handleCopyRow(log)}
                      title="Klik untuk menyalin baris ini"
                    >
                      <span className="text-muted-foreground shrink-0 w-28 sm:w-48 whitespace-nowrap overflow-hidden text-ellipsis sm:overflow-visible">
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
                      <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex items-start pt-0.5">
                        {copiedRowId === log.id
                          ? <Check className="w-3 h-3 text-success" />
                          : <Copy className="w-3 h-3" />}
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
