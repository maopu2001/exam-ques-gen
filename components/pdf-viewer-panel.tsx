"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileDown,
  Sparkles,
  ExternalLink,
  Cpu,
  Layers,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type { CompilationResult, CompilerLogEntry } from "@/lib/compiler/types";
import { PdfCanvasViewer } from "./pdf-canvas-viewer";

interface PdfViewerPanelProps {
  result: CompilationResult | null;
  isCompiling: boolean;
  progressPercent?: number;
  latestLog?: CompilerLogEntry | null;
}

export function PdfViewerPanel({
  result,
  isCompiling,
  progressPercent = 0,
  latestLog,
}: PdfViewerPanelProps) {
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

  // Aesthetic In-Progress Stage Card (No UI Flood)
  if (isCompiling) {
    const isDownloading =
      latestLog?.message.includes("Downloading") ||
      latestLog?.message.includes("Fetching") ||
      progressPercent < 40;

    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/10 select-none">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
          {/* Animated Icon Avatar */}
          <div className="relative size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            {isDownloading ? (
              <Cpu className="size-7 animate-pulse text-primary" />
            ) : (
              <Layers className="size-7 animate-bounce text-accent" />
            )}
            <div className="absolute -top-1 -right-1 size-3.5 rounded-full bg-accent animate-ping" />
          </div>

          {/* Title & Stage */}
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {isDownloading
                ? "Setting Up TeX Live WASM..."
                : "Compiling Exam in WebAssembly..."}
            </h3>
            <p className="text-xs text-muted-foreground font-medium truncate max-w-xs px-2">
              {latestLog?.message || "Processing LaTeX compilation..."}
            </p>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="w-full space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[11px] font-semibold font-mono">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Stage Badges */}
          <div className="flex items-center gap-1.5 pt-1">
            <Badge
              variant="outline"
              className={`text-[10px] py-0 h-5 font-medium transition-colors ${
                progressPercent >= 38
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              1. WASM Engine
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] py-0 h-5 font-medium transition-colors ${
                progressPercent >= 75
                  ? "bg-accent/15 text-accent border-accent/40"
                  : progressPercent >= 40
                  ? "bg-primary/15 text-primary border-primary/40 animate-pulse"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              2. XeLaTeX
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] py-0 h-5 font-medium transition-colors ${
                progressPercent >= 96
                  ? "bg-accent/15 text-accent border-accent/40"
                  : progressPercent >= 75
                  ? "bg-primary/15 text-primary border-primary/40 animate-pulse"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              3. Booklet PDF
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  if (
    !result ||
    !result.success ||
    (!result.masterPdfUrl && !result.masterPdfBytes)
  ) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/10 select-none">
        <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Sparkles className="size-7 text-accent" />
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
          {/* Open in New Tab Button */}
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
