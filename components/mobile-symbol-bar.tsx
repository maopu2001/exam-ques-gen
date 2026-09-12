"use client";

import { Button } from "@/components/ui/button";

interface MobileSymbolBarProps {
  onInsert: (text: string) => void;
}

const SYMBOLS = [
  { label: "$...$", value: "$$" },
  { label: "\\", value: "\\\\" },
  { label: '"', value: '""' },
  { label: "{ }", value: "{}" },
  { label: "[ ]", value: "[]" },
  { label: "\\frac", value: "\\\\frac{}{}" },
  { label: "\\sqrt", value: "\\\\sqrt{}" },
  { label: "\\text", value: "\\\\text{}" },
  { label: "\\times", value: "\\\\times" },
  { label: "^2", value: "^2" },
  { label: "\\le", value: "\\\\le" },
  { label: "\\ge", value: "\\\\ge" },
  { label: "\\theta", value: "\\\\theta" },
  { label: "\\circ", value: "^\\\\circ" },
];

export function MobileSymbolBar({ onInsert }: MobileSymbolBarProps) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-muted/90 border-t border-border overflow-x-auto shrink-0 no-scrollbar select-none z-10">
      <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 shrink-0">
        Insert:
      </span>
      {SYMBOLS.map((s) => (
        <Button
          key={s.label}
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px] font-mono shrink-0 rounded bg-card hover:bg-primary/10 hover:text-primary active:scale-95 transition-transform"
          onClick={() => onInsert(s.value)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
