"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/20 text-muted-foreground text-xs gap-2">
      <Loader2 className="size-4 animate-spin" />
      Loading Editor...
    </div>
  ),
});

interface JsonEditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function JsonEditorPanel({ value, onChange, error }: JsonEditorPanelProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editorTheme = mounted && resolvedTheme === "light" ? "light" : "vs-dark";

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language="json"
          theme={editorTheme}
          value={value}
          onChange={(val) => onChange(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
          }}
        />
      </div>
      {error && (
        <div className="p-2 bg-destructive/15 border-t border-destructive/30 text-destructive text-xs font-mono shrink-0 max-h-24 overflow-auto">
          <span className="font-bold">Syntax/Schema Error: </span>
          {error}
        </div>
      )}
    </div>
  );
}
