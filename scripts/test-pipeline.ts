import fs from "node:fs";
import path from "node:path";
import {
  compileExamToLatexBundle,
  toBanglaNum,
  formatBookletOrderForLatex,
} from "@/lib/generator";
import {
  imposeA5ToA4Booklet,
  mergeExamDocuments,
  A4_LANDSCAPE,
  A5_PORTRAIT,
  A4_PORTRAIT,
} from "@/lib/compiler/pdf-imposer";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function runTests() {
  console.log("==================================================");
  console.log(" RUNNING AUTOMATED EXAM GENERATOR & PDF TEST SUITE");
  console.log("==================================================\n");

  // 1. Test Bengali Number Conversion
  console.log("[1/4] Testing Bangla Number Converter...");
  const sampleNum = 1234567890;
  const banglaNum = toBanglaNum(sampleNum);
  if (banglaNum !== "১২৩৪৫৬৭৮৯০") {
    throw new Error(`Bangla number mismatch: expected ১২৩৪৫৬৭৮৯০, got ${banglaNum}`);
  }
  console.log(`  ✓ toBanglaNum(1234567890) = ${banglaNum}`);

  // 2. Test Booklet Imposition Formula
  console.log("\n[2/4] Testing 2x1 Folded Booklet Imposition Ordering...");
  const order3Pages = formatBookletOrderForLatex(3);
  console.log(`  ✓ 3 A5 Pages Booklet Order: ${order3Pages} (Expected: {{}, 1, 2, 3})`);
  if (order3Pages !== "{{}, 1, 2, 3}") {
    throw new Error(`Booklet order mismatch: ${order3Pages}`);
  }

  const order8Pages = formatBookletOrderForLatex(8);
  console.log(`  ✓ 8 A5 Pages Booklet Order: ${order8Pages}`);
  if (order8Pages !== "{8, 1, 2, 7, 6, 3, 4, 5}") {
    throw new Error(`Booklet order mismatch for 8 pages: ${order8Pages}`);
  }

  // 3. Test LaTeX Generator with Actual exam_data.json
  console.log("\n[3/4] Testing TypeScript LaTeX Generator against exam_data.json...");
  const jsonPath = path.join(process.cwd(), "LATEX_CODE", "exam_data.json");
  const rawJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const res = compileExamToLatexBundle(rawJson, {
    setName: "খ",
    shuffleMcq: true,
    seed: 42,
  });

  if (!res.success) {
    throw new Error(`Bundle generation failed: ${res.errors.join(", ")}`);
  }

  const { bundle } = res;
  console.log("  ✓ Generated config.tex (Length:", bundle.configTex.length, "bytes)");
  console.log("  ✓ Generated cq_questions.tex (Length:", bundle.cqTex.length, "bytes)");
  console.log("  ✓ Generated sq_questions.tex (Length:", bundle.sqTex.length, "bytes)");
  console.log("  ✓ Generated mcq_questions.tex (Length:", bundle.mcqTex.length, "bytes)");
  console.log("  ✓ Generated mcq_solutions.tex (Length:", bundle.solTex.length, "bytes)");

  // Assertions on generated LaTeX structure
  if (!bundle.configTex.includes("\\newcommand{\\examname}")) {
    throw new Error("Missing \\examname in config.tex");
  }
  if (!bundle.cqTex.includes("\\begin{cqitem}")) {
    throw new Error("Missing \\begin{cqitem} in cq_questions.tex");
  }
  if (!bundle.cqTex.includes("\\cqsection{ক বিভাগ (বীজগণিত)}")) {
    throw new Error("Missing Section 1 in cq_questions.tex");
  }
  if (!bundle.mcqTex.includes("\\begin{mcqitem}")) {
    throw new Error("Missing \\begin{mcqitem} in mcq_questions.tex");
  }
  if (!bundle.solTex.includes("\\begin{tabular}{|c|c|>{\\raggedright\\arraybackslash}p{6.4cm}|}")) {
    throw new Error("Missing Solutions tabular environment in mcq_solutions.tex");
  }

  // 4. Test In-Browser PDF Imposition & Stitching with pdf-lib
  console.log("\n[4/4] Testing In-Browser pdf-lib A5->A4 Imposition Engine...");
  
  // Create sample 3-page A5 PDF
  const sampleA5Doc = await PDFDocument.create();
  const font = await sampleA5Doc.embedFont(StandardFonts.Helvetica);
  for (let p = 1; p <= 3; p++) {
    const page = sampleA5Doc.addPage([A5_PORTRAIT.width, A5_PORTRAIT.height]);
    page.drawText(`Sample A5 Page ${p}`, { x: 50, y: 500, size: 18, font, color: rgb(0, 0, 0) });
  }
  const sampleA5Bytes = await sampleA5Doc.save();

  // Impose into 2x1 landscape booklet
  const { bookletPdfBytes, sheetCount, originalPageCount } = await imposeA5ToA4Booklet(sampleA5Bytes);
  const imposedDoc = await PDFDocument.load(bookletPdfBytes);
  
  console.log(`  ✓ Imposed ${originalPageCount} A5 pages into ${imposedDoc.getPageCount()} A4 Landscape sheets (${sheetCount} printable sides)`);
  if (imposedDoc.getPageCount() !== 2) {
    throw new Error(`Expected 2 landscape A4 sheets, got ${imposedDoc.getPageCount()}`);
  }
  
  const sheet1 = imposedDoc.getPage(0);
  const size = sheet1.getSize();
  console.log(`  ✓ Sheet 1 Dimensions: ${size.width.toFixed(2)} x ${size.height.toFixed(2)} pt (Expected: ${A4_LANDSCAPE.width} x ${A4_LANDSCAPE.height})`);
  if (Math.abs(size.width - A4_LANDSCAPE.width) > 0.1 || Math.abs(size.height - A4_LANDSCAPE.height) > 0.1) {
    throw new Error("Incorrect sheet dimensions in booklet imposition.");
  }

  // Create sample MCQ & Solution A4 pages
  const mcqDoc = await PDFDocument.create();
  mcqDoc.addPage([A4_PORTRAIT.width, A4_PORTRAIT.height]);
  const mcqBytes = await mcqDoc.save();

  const solDoc = await PDFDocument.create();
  solDoc.addPage([A4_PORTRAIT.width, A4_PORTRAIT.height]);
  const solBytes = await solDoc.save();

  // Merge Master Document
  const masterBytes = await mergeExamDocuments(bookletPdfBytes, mcqBytes, solBytes);
  const masterDoc = await PDFDocument.load(masterBytes);
  console.log(`  ✓ Master Unified PDF Page Count: ${masterDoc.getPageCount()} pages (2 Booklet + 1 MCQ + 1 Sol)`);
  if (masterDoc.getPageCount() !== 4) {
    throw new Error(`Expected 4 total pages in master PDF, got ${masterDoc.getPageCount()}`);
  }

  console.log("\n==================================================");
  console.log(" ALL TESTS PASSED SUCCESSFULLY (100% PARITY)");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
