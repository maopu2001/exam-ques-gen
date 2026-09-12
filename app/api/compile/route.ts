import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { compileExamToLatexBundle } from "@/lib/generator";
import type { CompilerLogEntry, CompilerStage } from "@/lib/compiler/types";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const logs: CompilerLogEntry[] = [];
  let tmpDir: string | null = null;

  const addLog = (
    stage: CompilerStage,
    message: string,
    type: CompilerLogEntry["type"] = "info"
  ) => {
    logs.push({
      id: Math.random().toString(36).substring(2, 9),
      stage,
      message,
      type,
      timestamp: Date.now(),
    });
  };

  try {
    const body = await req.json();
    const { jsonInput, options = {} } = body;

    addLog("preparing", "Validating JSON against NCTB exam schema...");
    const bundleResult = compileExamToLatexBundle(jsonInput, options);
    if (!bundleResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "JSON validation failed:\n" + bundleResult.errors.join("\n"),
          logs,
        },
        { status: 400 }
      );
    }

    addLog("preparing", "Generated LaTeX streams for CQ, SQ, MCQ & Solutions", "success");

    // Create unique isolated temp workspace for compilation
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "exam-build-"));
    const workdir = path.join(tmpDir, "main");
    const sectionsDir = path.join(workdir, "sections");
    fs.mkdirSync(sectionsDir, { recursive: true });

    // Copy template preamble and root files
    const projectRoot = process.cwd();
    const latexCodeDir = path.join(projectRoot, "LATEX_CODE");
    const srcMainDir = path.join(latexCodeDir, "main");

    fs.copyFileSync(
      path.join(srcMainDir, "preamble.tex"),
      path.join(workdir, "preamble.tex")
    );
    fs.copyFileSync(
      path.join(srcMainDir, "cq_sq_a5.tex"),
      path.join(workdir, "cq_sq_a5.tex")
    );
    fs.copyFileSync(
      path.join(srcMainDir, "main_mcq.tex"),
      path.join(workdir, "main_mcq.tex")
    );
    fs.copyFileSync(
      path.join(srcMainDir, "main_mcq_sol.tex"),
      path.join(workdir, "main_mcq_sol.tex")
    );

    // Write generated modular files
    const { bundle } = bundleResult;
    fs.writeFileSync(path.join(workdir, "config.tex"), bundle.configTex, "utf-8");
    fs.writeFileSync(path.join(sectionsDir, "cq_questions.tex"), bundle.cqTex, "utf-8");
    fs.writeFileSync(path.join(sectionsDir, "sq_questions.tex"), bundle.sqTex, "utf-8");
    fs.writeFileSync(path.join(sectionsDir, "mcq_questions.tex"), bundle.mcqTex, "utf-8");
    fs.writeFileSync(path.join(sectionsDir, "mcq_solutions.tex"), bundle.solTex, "utf-8");

    // 1. Compile CQ+SQ Portrait A5
    addLog("compiling_cq_sq", "--> [1/5] Compiling CQ + SQ Portrait A5 (cq_sq_a5.tex)...");
    await execFileAsync("xelatex", ["-interaction=nonstopmode", "cq_sq_a5.tex"], {
      cwd: workdir,
    });
    addLog("compiling_cq_sq", "Compiled cq_sq_a5.tex successfully.", "success");

    // 2. Impose CQ+SQ Booklet (Landscape A4)
    addLog("imposing_booklet", "--> [2/5] Compiling CQ + SQ A4 Folded Booklet (main_cq_sq.tex)...");
    
    // Count A5 pages to determine imposition
    const a5PdfPath = path.join(workdir, "cq_sq_a5.pdf");
    const a5PdfBytes = fs.readFileSync(a5PdfPath);
    // Simple regex page counter on binary PDF
    const countMatch = a5PdfBytes.toString("latin1").match(/\/Type\s*\/Page\b/g);
    const a5Pages = countMatch ? countMatch.length : 3;

    // Calculate booklet pages
    const totalBooklet = Math.ceil(a5Pages / 4) * 4;
    const pageList = Array.from({ length: a5Pages }, (_, i) => String(i + 1));
    while (pageList.length < totalBooklet) pageList.push("{}");
    const bookletOrder: string[] = [];
    const sheets = totalBooklet / 4;
    for (let s = 0; s < sheets; s++) {
      bookletOrder.push(
        pageList[totalBooklet - 1 - 2 * s],
        pageList[2 * s],
        pageList[2 * s + 1],
        pageList[totalBooklet - 2 - 2 * s]
      );
    }
    const bookletOrderStr = "{" + bookletOrder.join(", ") + "}";

    const mainCqSqTex = `\\documentclass[10pt,a4paper,landscape]{article}
\\usepackage[margin=0in]{geometry}
\\usepackage{pdfpages}
\\pagestyle{empty}
\\begin{document}
\\includepdf[pages=${bookletOrderStr}, nup=2x1, landscape=false, fitpaper=false]{cq_sq_a5.pdf}
\\end{document}
`;
    fs.writeFileSync(path.join(workdir, "main_cq_sq.tex"), mainCqSqTex, "utf-8");

    await execFileAsync("xelatex", ["-interaction=nonstopmode", "main_cq_sq.tex"], {
      cwd: workdir,
    });
    addLog("imposing_booklet", "Compiled main_cq_sq.tex booklet successfully.", "success");

    // 3. Compile MCQ Questions
    addLog("compiling_mcq", "--> [3/5] Compiling MCQ Questions 2-Column (main_mcq.tex)...");
    await execFileAsync("xelatex", ["-interaction=nonstopmode", "main_mcq.tex"], {
      cwd: workdir,
    });
    addLog("compiling_mcq", "Compiled main_mcq.tex successfully.", "success");

    // 4. Compile MCQ Solutions Table
    addLog("compiling_sol", "--> [4/5] Compiling MCQ Solutions Table (main_mcq_sol.tex)...");
    await execFileAsync("xelatex", ["-interaction=nonstopmode", "main_mcq_sol.tex"], {
      cwd: workdir,
    });
    addLog("compiling_sol", "Compiled main_mcq_sol.tex successfully.", "success");

    // 5. Compile Master Unified Exam PDF
    addLog("merging_master", "--> [5/5] Stitching Master Unified Exam PDF (main.tex)...");
    const includeSolutions = options.includeSolutions !== false;
    
    const solPdfInclusion = includeSolutions
      ? "\\includepdf[pages=-,fitpaper=true]{main/main_mcq_sol.pdf}\n"
      : "";

    const masterTex = `\\documentclass[a4paper]{article}
\\usepackage{pdfpages}
\\pagestyle{empty}
\\begin{document}
\\includepdf[pages=-,fitpaper=true]{main/main_cq_sq.pdf}
\\includepdf[pages=-,fitpaper=true]{main/main_mcq.pdf}
${solPdfInclusion}\\end{document}
`;
    fs.writeFileSync(path.join(tmpDir, "main.tex"), masterTex, "utf-8");

    await execFileAsync("xelatex", ["-interaction=nonstopmode", "main.tex"], {
      cwd: tmpDir,
    });
    addLog("complete", "Compiled master unified PDF successfully!", "success");

    // Read generated PDF binaries
    const masterPdfBytes = fs.readFileSync(path.join(tmpDir, "main.pdf"));
    const cqSqPdfBytes = fs.readFileSync(path.join(workdir, "main_cq_sq.pdf"));
    const mcqPdfBytes = fs.readFileSync(path.join(workdir, "main_mcq.pdf"));
    const solPdfBytes = fs.readFileSync(path.join(workdir, "main_mcq_sol.pdf"));

    const durationMs = Date.now() - startTime;
    addLog("complete", `All builds completed in ${(durationMs / 1000).toFixed(2)}s`, "success");

    return NextResponse.json({
      success: true,
      masterPdfBase64: masterPdfBytes.toString("base64"),
      cqSqPdfBase64: cqSqPdfBytes.toString("base64"),
      mcqPdfBase64: mcqPdfBytes.toString("base64"),
      solPdfBase64: solPdfBytes.toString("base64"),
      pageCount: 5,
      logs,
      durationMs,
    });
  } catch (err: any) {
    const errorMsg = err?.stderr || err?.stdout || err?.message || String(err);
    addLog("error", `XeLaTeX Error: ${errorMsg.slice(-400)}`, "error");

    return NextResponse.json(
      {
        success: false,
        error: errorMsg.slice(-800),
        logs,
      },
      { status: 500 }
    );
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
