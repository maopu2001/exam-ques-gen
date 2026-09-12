import type { CompileOptions } from "@/lib/generator";
import type {
  CompilationResult,
  CompilerLogEntry,
  CompilerStage,
  WorkerOutMessage,
} from "./types";
import { isAllDataCached, setCacheValid } from "./asset-cache";

export type ProgressCallback = (
  stage: CompilerStage,
  percent: number,
  log: CompilerLogEntry,
) => void;

export type WarmupProgressCallback = (progress: {
  percent: number;
  message: string;
  speed?: string;
}) => void;

class LatexCompilerEngine {
  private compilerWorker: Worker | null = null;
  private currentBlobUrl: string | null = null;
  private isWarmedUp: boolean = false;
  private warmupPromise: Promise<void> | null = null;

  private getCompilerWorker(): Worker {
    if (!this.compilerWorker) {
      this.compilerWorker = new Worker(
        new URL("../../workers/latex-compiler.worker.ts", import.meta.url),
        { type: "module" },
      );
    }
    return this.compilerWorker;
  }

  public async warmup(onProgress?: WarmupProgressCallback): Promise<void> {
    if (this.isWarmedUp) {
      onProgress?.({ percent: 100, message: "Ready", speed: "" });
      return;
    }

    if (this.warmupPromise) {
      return this.warmupPromise;
    }

    this.warmupPromise = (async () => {
      // 1. Fast path: Check if 30-day persistent IndexedDB cache is valid
      const alreadyCached = await isAllDataCached();
      if (alreadyCached) {
        this.isWarmedUp = true;
        onProgress?.({
          percent: 100,
          message: "Cache verified",
          speed: "",
        });
        return;
      }

      // 2. Cold path: Spawn dedicated Downloader Worker (Worker 1)
      const downloaderWorker = new Worker(
        new URL("../../workers/asset-downloader.worker.ts", import.meta.url),
        { type: "module" },
      );

      const requestId = Math.random().toString(36).substring(2, 9);
      let maxReportedPercent = 0;

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          downloaderWorker.removeEventListener("message", handleMessage);
          downloaderWorker.removeEventListener("error", handleError);
          downloaderWorker.terminate();
        };

        const handleError = (event: ErrorEvent) => {
          cleanup();
          reject(
            new Error(
              event.message || "Failed to initialize asset downloader worker",
            ),
          );
        };

        const handleMessage = (event: MessageEvent) => {
          const data = event.data;
          if (data.id !== requestId) return;

          if (data.type === "DOWNLOAD_PROGRESS") {
            maxReportedPercent = Math.min(
              100,
              Math.max(maxReportedPercent, data.percent),
            );
            onProgress?.({
              percent: maxReportedPercent,
              message: data.message,
              speed: data.speed || "",
            });
          } else if (
            data.type === "DOWNLOAD_COMPLETE" ||
            data.type === "DOWNLOAD_ERROR"
          ) {
            cleanup();
            if (data.type === "DOWNLOAD_COMPLETE") {
              setCacheValid();
            }
            if (data.type === "DOWNLOAD_ERROR") {
              reject(new Error(data.error || "Failed to download TeX assets"));
              return;
            }
            this.isWarmedUp = true;
            onProgress?.({
              percent: 100,
              message: "TeX Live engine ready",
              speed: "",
            });
            resolve();
          }
        };

        downloaderWorker.addEventListener("message", handleMessage);
        downloaderWorker.addEventListener("error", handleError);
        downloaderWorker.postMessage({
          type: "START_DOWNLOAD",
          id: requestId,
        });
      });
    })();

    try {
      await this.warmupPromise;
    } finally {
      this.warmupPromise = null;
    }
  }

  public async compile(
    jsonInput: unknown,
    options: CompileOptions = {},
    onProgress?: ProgressCallback,
  ): Promise<CompilationResult> {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // Spawn / use dedicated Compiler Worker (Worker 2)
    const worker = this.getCompilerWorker();
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
    if (this.compilerWorker) {
      this.compilerWorker.terminate();
      this.compilerWorker = null;
    }
    this.isWarmedUp = false;
    this.warmupPromise = null;
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }
}

export const compilerEngine = new LatexCompilerEngine();
