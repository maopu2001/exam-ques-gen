"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  FileText,
  Scan,
} from "lucide-react";

interface PdfCanvasViewerProps {
  pdfBytes?: Uint8Array;
  pdfUrl?: string;
  onDownload?: () => void;
  className?: string;
}

export function PdfCanvasViewer({
  pdfBytes,
  pdfUrl,
  className = "",
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(0);
  const [fitScale, setFitScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate exact fit-to-width scale for current container geometry
  const computeFitScale = useCallback(
    (doc: any, currentRotation: number, updateCurrentScale = false) => {
      if (!doc || !containerRef.current) return;
      doc
        .getPage(1)
        .then((page1: any) => {
          const baseViewport = page1.getViewport({
            scale: 1.0,
            rotation: currentRotation,
          });
          const containerWidth =
            containerRef.current?.clientWidth ||
            (typeof window !== "undefined" ? window.innerWidth : 800);

          const horizontalPadding = containerWidth < 640 ? 16 : 32;
          const availableWidth = Math.max(260, containerWidth - horizontalPadding);
          const computedScale = Number(
            (availableWidth / baseViewport.width).toFixed(2),
          );
          const finalFitScale = Math.max(0.2, Math.min(3.0, computedScale));

          setFitScale(finalFitScale);
          if (updateCurrentScale || scale === 0) {
            setScale(finalFitScale);
          }
        })
        .catch(() => {
          setFitScale(1.0);
          if (updateCurrentScale || scale === 0) {
            setScale(1.0);
          }
        });
    },
    [scale],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      setError(null);

      try {
        const pdfjs = await import("pdfjs-dist");

        // Configure worker
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }

        let loadingTask: any;
        if (pdfBytes && pdfBytes.length > 0) {
          const clonedBytes = new Uint8Array(pdfBytes.slice(0));
          loadingTask = pdfjs.getDocument({
            data: clonedBytes,
            useSystemFonts: true,
          });
        } else if (pdfUrl) {
          loadingTask = pdfjs.getDocument({
            url: pdfUrl,
            useSystemFonts: true,
          });
        } else {
          return;
        }

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          computeFitScale(doc, rotation, true);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || "Failed to render PDF.");
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfBytes, pdfUrl, rotation, computeFitScale]);

  // Responsive resize observer for automatic fit recalculation
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    let timeoutId: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        computeFitScale(pdfDoc, rotation, false);
      }, 100);
    });

    observer.observe(containerRef.current);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [pdfDoc, rotation, computeFitScale]);

  const scrollToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(numPages, targetPage));
      setCurrentPage(clamped);
      const el = document.getElementById(`pdf-page-${clamped}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [numPages],
  );

  const activeScale = scale || fitScale || 1.0;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-neutral-950/40 relative overflow-hidden ${className}`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-xs font-medium">Fitting and Rendering Exam Pages...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive text-center p-4">
          <FileText className="size-8 mb-1 opacity-60" />
          <span className="text-xs font-semibold">{error}</span>
          <span className="text-[11px] text-muted-foreground">
            Try clicking Master PDF to download directly.
          </span>
        </div>
      ) : (
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Controls Bar */}
          <div className="px-3 py-1.5 bg-card border-b border-border flex items-center justify-between shrink-0 z-10 gap-2 overflow-x-auto select-none shadow-2xs">
            {/* Page Nav */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 cursor-pointer"
                disabled={currentPage <= 1}
                onClick={() => scrollToPage(currentPage - 1)}
                title="Previous Page"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <span className="text-xs font-semibold text-foreground px-1 font-mono">
                {currentPage} / {numPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 cursor-pointer"
                disabled={currentPage >= numPages}
                onClick={() => scrollToPage(currentPage + 1)}
                title="Next Page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 cursor-pointer"
                onClick={() =>
                  setScale((s) =>
                    Math.max(0.2, Number(((s || fitScale) - 0.15).toFixed(2))),
                  )
                }
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>

              <span
                className="text-[11px] font-bold text-muted-foreground w-12 text-center font-mono cursor-pointer hover:text-primary transition-colors"
                onClick={() => setScale(fitScale)}
                title="Click to Reset to Fit Width"
              >
                {Math.round((activeScale / (fitScale || 1)) * 100)}%
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 cursor-pointer"
                onClick={() =>
                  setScale((s) =>
                    Math.min(3.0, Number(((s || fitScale) + 0.15).toFixed(2))),
                  )
                }
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>

              {/* Fit to Width Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1 cursor-pointer border-border font-medium"
                onClick={() => setScale(fitScale)}
                title="Fit to Width"
              >
                <Scan className="size-3 text-primary" />
                <span>Fit</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hidden sm:inline-flex cursor-pointer"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
              >
                <RotateCw className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Native Viewport with Zero Excess Scroll */}
          <div
            ref={scrollViewportRef}
            className="flex-1 w-full h-full overflow-y-auto overflow-x-auto bg-neutral-900/30"
          >
            <div className="w-fit min-w-full flex flex-col items-center justify-start pt-3 pb-3 gap-6">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <PdfPageCanvas
                  key={`${pageNum}-${activeScale}-${rotation}`}
                  pdfDoc={pdfDoc}
                  pageNum={pageNum}
                  scale={activeScale}
                  rotation={rotation}
                  onInView={() => setCurrentPage(pageNum)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  rotation: number;
  onInView?: () => void;
}

function PdfPageCanvas({
  pdfDoc,
  pageNum,
  scale,
  rotation,
  onInView,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isActive = true;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isActive) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const dpr =
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const targetWidth = Math.floor(viewport.width);
        const targetHeight = Math.floor(viewport.height);

        if (containerBoxRef.current) {
          containerBoxRef.current.style.width = `${targetWidth}px`;
          containerBoxRef.current.style.height = `${targetHeight}px`;
        }

        // Render crisp native resolution
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;

        const renderContext = {
          canvasContext: context,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        const task = page.render(renderContext);
        await task.promise;
      } catch {
        // Suppress cancellation exceptions
      }
    }

    renderPage();

    return () => {
      isActive = false;
    };
  }, [pdfDoc, pageNum, scale, rotation]);

  // Track currently visible page in viewport via IntersectionObserver
  useEffect(() => {
    const el = containerBoxRef.current;
    if (!el || !onInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          onInView();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onInView]);

  return (
    <div
      ref={containerBoxRef}
      id={`pdf-page-${pageNum}`}
      className="relative flex flex-col items-center shadow-xl rounded-sm bg-white overflow-hidden border border-border/90 shrink-0 select-none pointer-events-auto scroll-mt-3"
    >
      <canvas ref={canvasRef} className="block select-none pointer-events-none" />
      <div className="absolute bottom-1.5 right-2.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono select-none opacity-50 hover:opacity-100 transition-opacity">
        Page {pageNum}
      </div>
    </div>
  );
}
