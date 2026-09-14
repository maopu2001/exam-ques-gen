import type { CompileOptions } from "@/lib/generator";

export type CompilerStage =
  | "idle"
  | "preparing"
  | "compiling_cq_sq"
  | "imposing_booklet"
  | "compiling_mcq"
  | "compiling_sol"
  | "merging_master"
  | "complete"
  | "error";

export interface CompilerLogEntry {
  id: string;
  stage: CompilerStage;
  message: string;
  type: "info" | "stdout" | "stderr" | "error" | "success";
  timestamp: number;
}

export interface CompilationResult {
  success: boolean;
  masterPdfUrl?: string;
  masterPdfBytes?: Uint8Array;
  cqSqPdfBytes?: Uint8Array;
  mcqPdfBytes?: Uint8Array;
  solPdfBytes?: Uint8Array;
  pageCount?: number;
  logs: CompilerLogEntry[];
  error?: string;
  durationMs: number;
}

interface WorkerCompileRequest {
  type: "COMPILE_EXAM";
  id: string;
  jsonInput: unknown;
  options?: CompileOptions;
}

interface WorkerProgressMessage {
  type: "PROGRESS";
  id: string;
  stage: CompilerStage;
  progressPercent: number;
  log: CompilerLogEntry;
}

interface WorkerSuccessMessage {
  type: "SUCCESS";
  id: string;
  result: CompilationResult;
}

interface WorkerErrorMessage {
  type: "ERROR";
  id: string;
  error: string;
  logs: CompilerLogEntry[];
}

export type WorkerInMessage = WorkerCompileRequest;
export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerSuccessMessage
  | WorkerErrorMessage;
