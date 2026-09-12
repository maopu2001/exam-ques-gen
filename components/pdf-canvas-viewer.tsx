"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
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
  onDownload,
  className = "",
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [fitScale, setFitScale] = useState<number>(0.85);
  const [liveScale, setLiveScale] = useState<number>(0.85);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF Document via PDF.js & compute exact Fit-Width scale
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

          // Calculate exact Fit-Width scale based on first page geometry & container width
          try {
            const page1 = await doc.getPage(1);
            const baseViewport = page1.getViewport({ scale: 1.35, rotation });
            const containerWidth =
              containerRef.current?.clientWidth ||
              (typeof window !== "undefined" ? window.innerWidth : 800);
            
            // Available width considering padding on mobile/desktop
            const padding = containerWidth < 640 ? 20 : 48;
            const availableWidth = Math.max(280, containerWidth - padding);
            const calculatedScale = Math.min(
              1.0,
              Math.max(0.3, Number((availableWidth / baseViewport.width).toFixed(2)))
            );
            setFitScale(calculatedScale);
            setLiveScale(calculatedScale);
          } catch {
            setFitScale(0.75);
            setLiveScale(0.75);
          }

          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to load PDF in Canvas viewer:", err);
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
  }, [pdfBytes, pdfUrl, rotation]);

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
        <TransformWrapper
          key={`transform-${fitScale}`}
          initialScale={fitScale}
          minScale={Math.max(0.2, Number((fitScale * 0.5).toFixed(2)))}
          maxScale={4}
          centerOnInit={false}
          initialPositionX={0}
          initialPositionY={0}
          wheel={{ disabled: true }}
          panning={{ disabled: true }}
          pinch={{ disabled: false, step: 5 }}
          doubleClick={{ disabled: false, mode: "toggle", step: 1.5 }}
          onTransform={(ref) => {
            setLiveScale(ref.state.scale);
          }}
        >
          {({ zoomIn, zoomOut, setTransform }) => (
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
                    onClick={() => {
                      const prev = Math.max(1, currentPage - 1);
                      setCurrentPage(prev);
                      const el = document.getElementById(`pdf-page-${prev}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }}
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
                    onClick={() => {
                      const next = Math.min(numPages, currentPage + 1);
                      setCurrentPage(next);
                      const el = document.getElementById(`pdf-page-${next}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }}
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
                    onClick={() => zoomOut(0.2)}
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-3.5" />
                  </Button>

                  <span
                    className="text-[11px] font-bold text-muted-foreground w-12 text-center font-mono cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setTransform(0, 0, fitScale);
                      setLiveScale(fitScale);
                    }}
                    title="Click to Reset to Fit Width"
                  >
                    {Math.round((liveScale / (fitScale || 1)) * 100)}%
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer"
                    onClick={() => zoomIn(0.2)}
                    title="Zoom In"
                  >
                    <ZoomIn className="size-3.5" />
                  </Button>

                  {/* Fit to Width Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 cursor-pointer border-border font-medium"
                    onClick={() => {
                      setTransform(0, 0, fitScale);
                      setLiveScale(fitScale);
                    }}
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

              {/* Viewport with Native Scroll for Mac/Laptops and Pinch for Mobile */}
              <div className="flex-1 w-full h-full overflow-hidden bg-neutral-900/30">
                <TransformComponent
                  wrapperClass="!w-full !h-full !overflow-y-auto !overflow-x-auto"
                  contentClass="!w-full min-h-full flex flex-col items-center justify-start pt-4 pb-20 px-2 sm:px-6 gap-6"
                  wrapperStyle={{
                    width: "100%",
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "auto",
                  }}
                >
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                    <PdfPageCanvas
                      key={pageNum}
                      pdfDoc={pdfDoc}
                      pageNum={pageNum}
                      rotation={rotation}
                      onInView={() => setCurrentPage(pageNum)}
                    />
                  ))}
                </TransformComponent>
              </div>
            </div>
          )}
        </TransformWrapper>
      )}
    </div>
  );
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNum: number;
  rotation: number;
  onInView?: () => void;
}

function PdfPageCanvas({
  pdfDoc,
  pageNum,
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

        // Render at crisp 1.35x baseline for sharp text rendering
        const baseScale = 1.35;
        const viewport = page.getViewport({ scale: baseScale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const targetWidth = Math.floor(viewport.width);
        const targetHeight = Math.floor(viewport.height);

        if (containerBoxRef.current) {
          containerBoxRef.current.style.width = `${targetWidth}px`;
          containerBoxRef.current.style.height = `${targetHeight}px`;
        }

        // Render in-place with crisp DPR
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
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    }

    renderPage();

    return () => {
      isActive = false;
    };
  }, [pdfDoc, pageNum, rotation]);

  return (
    <div
      ref={containerBoxRef}
      id={`pdf-page-${pageNum}`}
      className="relative flex flex-col items-center shadow-xl rounded-sm bg-white overflow-hidden border border-border/90 shrink-0 select-none pointer-events-auto"
    >
      <canvas ref={canvasRef} className="block select-none pointer-events-none" />
      <div className="absolute bottom-1.5 right-2.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono select-none opacity-50 hover:opacity-100 transition-opacity">
        Page {pageNum}
      </div>
    </div>
  );
}
