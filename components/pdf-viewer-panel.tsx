"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, Sparkles, ExternalLink } from "lucide-react";
import type { CompilationResult } from "@/lib/compiler/types";

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
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/20">
        <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <h3 className="text-sm font-semibold mb-1">Compiling Exam PDF...</h3>
        <p className="text-xs text-muted-foreground max-w-xs">
          Generating modular LaTeX streams and assembling booklet imposition in browser.
        </p>
      </div>
    );
  }

  if (!result || !result.success || !result.masterPdfUrl) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/20">
        <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Sparkles className="size-8" />
        </div>
        <h3 className="font-medium text-base mb-1">Live PDF Preview</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Click &quot;Compile Exam PDF&quot; in the top bar to generate and inspect the multi-page exam document.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-neutral-900/10">
      {/* Top Controls Bar */}
      <div className="px-3 py-2 border-b bg-card/70 backdrop-blur flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {result.pageCount} Pages Generated
          </Badge>
          <span className="text-xs text-muted-foreground">
            in {(result.durationMs / 1000).toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => window.open(result.masterPdfUrl, "_blank")}
          >
            <ExternalLink className="size-3" />
            Open Tab
          </Button>

          {result.cqSqPdfBytes && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => downloadBlob(result.cqSqPdfBytes, "cq_sq_booklet.pdf")}
            >
              <FileDown className="size-3" />
              CQ+SQ
            </Button>
          )}

          {result.mcqPdfBytes && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => downloadBlob(result.mcqPdfBytes, "mcq_questions.pdf")}
            >
              <FileDown className="size-3" />
              MCQ
            </Button>
          )}

          {result.solPdfBytes && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => downloadBlob(result.solPdfBytes, "mcq_solutions.pdf")}
            >
              <FileDown className="size-3" />
              Solutions
            </Button>
          )}

          <Button
            size="sm"
            className="h-7 text-xs gap-1 shadow-sm"
            onClick={() => downloadBlob(result.masterPdfBytes, "main.pdf")}
          >
            <Download className="size-3" />
            Master PDF
          </Button>
        </div>
      </div>

      {/* PDF Canvas / Embed */}
      <div className="flex-1 w-full h-full p-2 overflow-hidden bg-neutral-900">
        <iframe
          src={result.masterPdfUrl}
          className="w-full h-full rounded border border-neutral-800 bg-white"
          title="Exam PDF Preview"
        />
      </div>
    </div>
  );
}
