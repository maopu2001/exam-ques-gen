import type { CompileOptions } from "@/lib/generator";
import type {
  CompilationResult,
  CompilerLogEntry,
  CompilerStage,
  WorkerOutMessage,
} from "./types";

export type ProgressCallback = (
  stage: CompilerStage,
  percent: number,
  log: CompilerLogEntry
) => void;

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

class LatexCompilerEngine {
  private worker: Worker | null = null;
  private currentBlobUrl: string | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../../workers/latex-compiler.worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    return this.worker;
  }

  public async compile(
    jsonInput: unknown,
    options: CompileOptions = {},
    onProgress?: ProgressCallback
  ): Promise<CompilationResult> {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // 1. First Attempt: Native High-Fidelity XeLaTeX Engine via API
    try {
      onProgress?.("preparing", 15, {
        id: "log-1",
        stage: "preparing",
        message: "Sending exam JSON to XeLaTeX compilation pipeline...",
        type: "info",
        timestamp: Date.now(),
      });

      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonInput, options }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Emit logs from server
        if (Array.isArray(data.logs)) {
          data.logs.forEach((l: CompilerLogEntry, idx: number) => {
            const pct = Math.min(95, 20 + idx * 15);
            onProgress?.(l.stage, pct, l);
          });
        }

        const masterPdfBytes = base64ToUint8Array(data.masterPdfBase64);
        const cqSqPdfBytes = data.cqSqPdfBase64
          ? base64ToUint8Array(data.cqSqPdfBase64)
          : undefined;
        const mcqPdfBytes = data.mcqPdfBase64
          ? base64ToUint8Array(data.mcqPdfBase64)
          : undefined;
        const solPdfBytes = data.solPdfBase64
          ? base64ToUint8Array(data.solPdfBase64)
          : undefined;

        const blob = new Blob([masterPdfBytes as any], {
          type: "application/pdf",
        });
        const masterPdfUrl = URL.createObjectURL(blob);
        this.currentBlobUrl = masterPdfUrl;

        onProgress?.("complete", 100, {
          id: "log-done",
          stage: "complete",
          message: `XeLaTeX build complete (${(data.durationMs / 1000).toFixed(2)}s).`,
          type: "success",
          timestamp: Date.now(),
        });

        return {
          success: true,
          masterPdfUrl,
          masterPdfBytes,
          cqSqPdfBytes,
          mcqPdfBytes,
          solPdfBytes,
          pageCount: data.pageCount || 5,
          logs: data.logs || [],
          durationMs: data.durationMs || 0,
        };
      } else if (data.error) {
        return {
          success: false,
          logs: data.logs || [],
          error: data.error,
          durationMs: 0,
        };
      }
    } catch (apiErr) {
      console.warn("Server compilation route unavailable, falling back to Web Worker:", apiErr);
    }

    // 2. Fallback Attempt: Client-side Web Worker
    const worker = this.getWorker();
    const requestId = Math.random().toString(36).substring(2, 9);

    return new Promise<CompilationResult>((resolve) => {
      const handleMessage = (event: MessageEvent<WorkerOutMessage>) => {
        const data = event.data;
        if (data.id !== requestId) return;

        if (data.type === "PROGRESS") {
          onProgress?.(data.stage, data.progressPercent, data.log);
        } else if (data.type === "SUCCESS") {
          worker.removeEventListener("message", handleMessage);

          let masterPdfUrl: string | undefined = undefined;
          if (data.result.masterPdfBytes) {
            const blob = new Blob([data.result.masterPdfBytes as any], {
              type: "application/pdf",
            });
            masterPdfUrl = URL.createObjectURL(blob);
            this.currentBlobUrl = masterPdfUrl;
          }

          resolve({
            ...data.result,
            masterPdfUrl,
          });
        } else if (data.type === "ERROR") {
          worker.removeEventListener("message", handleMessage);
          resolve({
            success: false,
            logs: data.logs,
            error: data.error,
            durationMs: 0,
          });
        }
      };

      worker.addEventListener("message", handleMessage);

      worker.postMessage({
        type: "COMPILE_EXAM",
        id: requestId,
        jsonInput,
        options,
      });
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }
}

export const compilerEngine = new LatexCompilerEngine();
