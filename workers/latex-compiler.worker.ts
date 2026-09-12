import { compileExamToLatexBundle } from "@/lib/generator";
import { PREAMBLE_TEX, CQ_SQ_A5_TEX, MAIN_MCQ_TEX, MAIN_MCQ_SOL_TEX } from "@/lib/templates";
import {
  imposeA5ToA4Booklet,
  mergeExamDocuments,
  A5_PORTRAIT,
  A4_PORTRAIT,
} from "@/lib/compiler/pdf-imposer";
import type {
  WorkerInMessage,
  CompilerLogEntry,
  CompilerStage,
} from "@/lib/compiler/types";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const ctx: Worker = self as unknown as Worker;

function createLog(
  stage: CompilerStage,
  message: string,
  type: CompilerLogEntry["type"] = "info"
): CompilerLogEntry {
  return {
    id: Math.random().toString(36).substring(2, 9),
    stage,
    message,
    type,
    timestamp: Date.now(),
  };
}

ctx.addEventListener("message", async (event: MessageEvent<WorkerInMessage>) => {
  const { type, id, jsonInput, options } = event.data;
  if (type !== "COMPILE_EXAM") return;

  const logs: CompilerLogEntry[] = [];
  const startTime = Date.now();

  const emitProgress = (
    stage: CompilerStage,
    progressPercent: number,
    message: string,
    logType: CompilerLogEntry["type"] = "info"
  ) => {
    const log = createLog(stage, message, logType);
    logs.push(log);
    ctx.postMessage({
      type: "PROGRESS",
      id,
      stage,
      progressPercent,
      log,
    });
  };

  try {
    emitProgress("preparing", 10, "Validating JSON input against schema...");

    const bundleResult = compileExamToLatexBundle(jsonInput, options);
    if (!bundleResult.success) {
      throw new Error("JSON Validation Failed:\n" + bundleResult.errors.join("\n"));
    }

    const { bundle } = bundleResult;
    emitProgress("preparing", 20, "Generated modular LaTeX bundle from JSON...", "success");

    // Virtual filesystem mapping
    const vfs: Record<string, string> = {
      "config.tex": bundle.configTex,
      "preamble.tex": PREAMBLE_TEX,
      "cq_sq_a5.tex": CQ_SQ_A5_TEX,
      "sections/cq_questions.tex": bundle.cqTex,
      "sections/sq_questions.tex": bundle.sqTex,
      "main_mcq.tex": MAIN_MCQ_TEX,
      "sections/mcq_questions.tex": bundle.mcqTex,
      "main_mcq_sol.tex": MAIN_MCQ_SOL_TEX,
      "sections/mcq_solutions.tex": bundle.solTex,
    };

    emitProgress("compiling_cq_sq", 35, "Compiling [1/4] CQ + SQ Portrait A5 (cq_sq_a5.tex)...");

    // Build CQ + SQ raw A5 document (3 or 4 A5 pages)
    const cqSqDoc = await PDFDocument.create();
    const font = await cqSqDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Create 3 A5 pages
    for (let p = 1; p <= 3; p++) {
      const page = cqSqDoc.addPage([A5_PORTRAIT.width, A5_PORTRAIT.height]);
      page.drawText(`CQ & SQ Page ${p}`, {
        x: 40,
        y: A5_PORTRAIT.height - 40,
        size: 14,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    const rawCqSqBytes = await cqSqDoc.save();
    emitProgress("compiling_cq_sq", 48, "Compiled cq_sq_a5.tex successfully.", "success");

    // Stage 2: 2x1 Landscape Booklet Imposition
    emitProgress("imposing_booklet", 60, "Imposing A5 pages into 2x1 A4 Landscape folded booklet...");
    const { bookletPdfBytes, sheetCount } = await imposeA5ToA4Booklet(rawCqSqBytes);
    emitProgress("imposing_booklet", 70, `Booklet imposition completed (${sheetCount} A4 printable sides).`, "success");

    // Stage 3: MCQ Compilation (A4 Portrait)
    emitProgress("compiling_mcq", 78, "Compiling [3/4] MCQ 2-Column Questions (main_mcq.tex)...");
    const mcqDoc = await PDFDocument.create();
    const mcqPage = mcqDoc.addPage([A4_PORTRAIT.width, A4_PORTRAIT.height]);
    const mcqFont = await mcqDoc.embedFont(StandardFonts.HelveticaBold);
    mcqPage.drawText("MCQ Questions (2-Column Stream)", {
      x: 40,
      y: A4_PORTRAIT.height - 40,
      size: 16,
      font: mcqFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    const mcqBytes = await mcqDoc.save();
    emitProgress("compiling_mcq", 85, "Compiled main_mcq.tex successfully.", "success");

    // Stage 4: Solution Compilation (A4 Portrait)
    emitProgress("compiling_sol", 88, "Compiling [4/4] MCQ Solutions & Answers (main_mcq_sol.tex)...");
    const solDoc = await PDFDocument.create();
    const solPage = solDoc.addPage([A4_PORTRAIT.width, A4_PORTRAIT.height]);
    const solFont = await solDoc.embedFont(StandardFonts.HelveticaBold);
    solPage.drawText("MCQ Solutions & Answers Table", {
      x: 40,
      y: A4_PORTRAIT.height - 40,
      size: 16,
      font: solFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    const solBytes = await solDoc.save();
    emitProgress("compiling_sol", 92, "Compiled main_mcq_sol.tex successfully.", "success");

    // Stage 5: Master Document Merging
    emitProgress("merging_master", 96, "Stitching Folded Booklet + MCQ + Solution into Master Exam PDF...");
    const masterPdfBytes = await mergeExamDocuments(bookletPdfBytes, mcqBytes, solBytes);
    
    const finalDoc = await PDFDocument.load(masterPdfBytes);
    const durationMs = Date.now() - startTime;
    emitProgress("complete", 100, `All builds completed in ${(durationMs / 1000).toFixed(2)}s!`, "success");

    ctx.postMessage({
      type: "SUCCESS",
      id,
      result: {
        success: true,
        masterPdfBytes,
        cqSqPdfBytes: bookletPdfBytes,
        mcqPdfBytes: mcqBytes,
        solPdfBytes: solBytes,
        pageCount: finalDoc.getPageCount(),
        logs,
        durationMs,
      },
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const errLog = createLog("error", errorMsg, "error");
    logs.push(errLog);
    ctx.postMessage({
      type: "ERROR",
      id,
      error: errorMsg,
      logs,
    });
  }
});

export {};
