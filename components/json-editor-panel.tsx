"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { MobileSymbolBar } from "./mobile-symbol-bar";

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
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editorTheme = mounted && resolvedTheme === "light" ? "light" : "vs-dark";

  const handleInsertSymbol = (symbolText: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const op = {
        range: selection,
        text: symbolText,
        forceMoveMarkers: true,
      };
      editor.executeEdits("symbol-bar", [op]);
      editor.focus();
    } else {
      onChange(value + symbolText);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-hidden min-h-0">
        <MonacoEditor
          height="100%"
          language="json"
          theme={editorTheme}
          value={value}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          onChange={(val) => onChange(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* Mobile Symbol Accessory Bar */}
      <div className="md:hidden">
        <MobileSymbolBar onInsert={handleInsertSymbol} />
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
