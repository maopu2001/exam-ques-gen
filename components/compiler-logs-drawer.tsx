"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { CompilerLogEntry } from "@/lib/compiler/types";

interface CompilerLogsDrawerProps {
  logs: CompilerLogEntry[];
  isCompiling: boolean;
  progressPercent: number;
}

export function CompilerLogsDrawer({ logs, isCompiling, progressPercent }: CompilerLogsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const latestLog = logs[logs.length - 1];

  return (
    <div className="border-t bg-card/90 backdrop-blur shrink-0 transition-all">
      {/* Header bar */}
      <div className="px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Terminal className="size-3.5" />
            <span>Compiler Output</span>
            {isOpen ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>

          {isCompiling && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] animate-pulse bg-primary/10 text-primary">
              Compiling ({progressPercent}%)
            </Badge>
          )}

          {latestLog && (
            <span className="truncate text-muted-foreground font-mono text-[11px] hidden sm:inline">
              {latestLog.message}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {logs.length} events
          </span>
        </div>
      </div>

      {/* Expandable terminal log viewer */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="h-44 p-3 bg-neutral-950 font-mono text-[11px] text-neutral-300 overflow-auto border-t border-neutral-800 space-y-1"
        >
          {logs.length === 0 ? (
            <div className="text-neutral-500 italic">No compilation logs yet. Click &quot;Compile Exam PDF&quot;.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-neutral-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {log.type === "success" && <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />}
                {log.type === "error" && <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />}
                {log.type === "info" && <Info className="size-3.5 text-primary shrink-0 mt-0.5" />}
                <span
                  className={
                    log.type === "error"
                      ? "text-destructive font-semibold"
                      : log.type === "success"
                      ? "text-accent"
                      : "text-foreground"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
