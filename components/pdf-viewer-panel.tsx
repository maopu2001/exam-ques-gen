"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, Sparkles, ExternalLink } from "lucide-react";
import type { CompilationResult } from "@/lib/compiler/types";
import { PdfCanvasViewer } from "./pdf-canvas-viewer";

interface PdfViewerPanelProps {
  result: CompilationResult | null;
  isCompiling: boolean;
}

export function PdfViewerPanel({ result, isCompiling }: PdfViewerPanelProps) {
  const downloadBlob = (bytes?: Uint8Array, filename = "exam.pdf") => {
    if (!bytes) return;
    const blob = new Blob([bytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isCompiling) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/10">
        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
        <h3 className="text-sm font-semibold mb-1 text-foreground">
          Compiling XeLaTeX Exam PDF...
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Rendering Bangla typography, generating booklet imposition, and
          compiling math equations.
        </p>
      </div>
    );
  }

  if (
    !result ||
    !result.success ||
    (!result.masterPdfUrl && !result.masterPdfBytes)
  ) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/10">
        <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Sparkles className="size-7 text-yellow-600" />
        </div>
        <h3 className="font-semibold text-base mb-1 text-foreground">
          Universal PDF Canvas Ready
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Click &quot;Compile Exam PDF&quot; or press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">
            Ctrl+Enter
          </kbd>{" "}
          to view your high-fidelity paper.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-card overflow-hidden">
      {/* Top Controls Bar */}
      <div className="px-3 py-2 border-b border-border bg-card flex items-center justify-between shrink-0 gap-2 overflow-x-auto select-none">
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs font-semibold">
            {result.pageCount} Pages
          </Badge>
          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
            {(result.durationMs / 1000).toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Open in New Tab Button (Replaces Fullscreen across all devices) */}
          {result.masterPdfUrl && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-border"
              onClick={() => window.open(result.masterPdfUrl, "_blank")}
              title="Open PDF in a new browser tab"
            >
              <ExternalLink className="size-3 text-primary" />
              <span>Open in Tab</span>
            </Button>
          )}

          {result.cqSqPdfBytes && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-border hidden md:inline-flex"
              onClick={() => downloadBlob(result.cqSqPdfBytes, "CQ+SQ.pdf")}
            >
              <FileDown className="size-3" />
              CQ+SQ
            </Button>
          )}

          {result.mcqPdfBytes && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-border hidden md:inline-flex"
              onClick={() => downloadBlob(result.mcqPdfBytes, "MCQ.pdf")}
            >
              <FileDown className="size-3" />
              MCQ
            </Button>
          )}

          {result.solPdfBytes && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-border hidden md:inline-flex"
              onClick={() => downloadBlob(result.solPdfBytes, "Solution.pdf")}
            >
              <FileDown className="size-3" />
              Solutions
            </Button>
          )}

          <Button
            size="sm"
            className="h-7 text-xs gap-1 shadow-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => downloadBlob(result.masterPdfBytes, "Full.pdf")}
          >
            <Download className="size-3" />
            Full PDF
          </Button>
        </div>
      </div>

      {/* HTML5 Canvas Cross-Device PDF Viewport */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        <PdfCanvasViewer
          pdfBytes={result.masterPdfBytes}
          pdfUrl={result.masterPdfUrl}
          onDownload={() => downloadBlob(result.masterPdfBytes, "Full.pdf")}
        />
      </div>
    </div>
  );
}
