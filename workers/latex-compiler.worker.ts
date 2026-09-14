import { compileExamToLatexBundle } from "@/lib/generator";
import {
  PREAMBLE_TEX,
  CQ_SQ_A5_TEX,
  MAIN_MCQ_TEX,
  MAIN_MCQ_SOL_TEX,
} from "@/lib/templates";
import {
  imposeA5ToA4Booklet,
  mergeExamDocuments,
} from "@/lib/compiler/pdf-imposer";
import type {
  WorkerInMessage,
  CompilerLogEntry,
  CompilerStage,
} from "@/lib/compiler/types";
import { BusyTexRunner, XeLatex, type FileInput } from "texlyre-busytex";
import { getFontFromDB } from "@/lib/compiler/asset-cache";
import { getBinaryAssetFromDB } from "@/lib/compiler/binary-cache";
import { getStylesFromDB } from "@/lib/compiler/styles-cache";
import { COMPILER_BINARY_ASSETS } from "@/lib/compiler/bundle-registry";

const ctx: Worker = self as unknown as Worker;

const BUSYTEX_LOCAL_BASE =
  "https://texlyre.github.io/texlyre-busytex/core/busytex";

const VALID_PRELOAD_PACKAGES = [`${BUSYTEX_LOCAL_BASE}/texlive-basic.js`];

function createLog(
  stage: CompilerStage,
  message: string,
  type: CompilerLogEntry["type"] = "info",
): CompilerLogEntry {
  return {
    id: Math.random().toString(36).substring(2, 9),
    stage,
    message,
    type,
    timestamp: Date.now(),
  };
}

/**
 * Extracts complete, detailed line-numbered LaTeX compilation errors from raw TeX log.
 */
function extractLatexError(log: string): string {
  if (!log) return "Unknown LaTeX compilation failure (log was empty).";

  const lines = log.split("\n");
  const extractedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.startsWith("! ") ||
      line.includes("Error:") ||
      line.includes("Fatal error") ||
      line.includes("Emergency stop")
    ) {
      const contextChunk = lines.slice(i, Math.min(lines.length, i + 8));
      extractedLines.push(...contextChunk);
      break;
    }
  }

  if (extractedLines.length > 0) {
    return extractedLines.join("\n");
  }

  return lines.slice(-20).join("\n");
}

let cachedRunner: BusyTexRunner | null = null;
let cachedFontBytes: Uint8Array | null = null;

async function getCachedKalpurushFont(): Promise<Uint8Array> {
  if (cachedFontBytes && cachedFontBytes.length > 0) return cachedFontBytes;

  // 1. Read strictly from 30-day IndexedDB store (Zero network)
  try {
    const fromDB = await getFontFromDB();
    if (fromDB && fromDB.length > 0) {
      cachedFontBytes = fromDB;
      return cachedFontBytes;
    }
  } catch {}

  throw new Error(
    "Kalpurush font binary missing from the local compiler bundle. Please reload the page.",
  );
}

/**
 * Creates an in-memory Web Worker with console silencing and local-first package loading.
 */
async function createCORSWorker(
  assetUrls: Record<string, string>,
): Promise<Worker> {
  const workerCode = `
self.console.log = function() {};
self.console.info = function() {};

const localAssets = ${JSON.stringify(assetUrls)};
const nativeFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const source = String(input);
  const target = localAssets[source] || source.replace(/\\.js$/, ".data");
  return nativeFetch(localAssets[target] || target, init);
};
importScripts(localAssets.busytexPipeline);
const localScriptLoader = (url) => importScripts(localAssets[url] || url);
BusytexPipeline.ScriptLoaderWorker = localScriptLoader;

self.pipeline = null;

onmessage = async ({ data: {
  files: e,
  main_tex_path: t,
  bibtex: i,
  biber: s,
  makeindex: a,
  rerun: p,
  busytex_wasm: l,
  busytex_js: r,
  biber_js: n,
  biber_wasm: o,
  biber_data: c,
  preload_data_packages_js: _,
  data_packages_js: d,
  texmf_local: g,
  preload: x,
  verbose: f,
  driver: m,
  remote_endpoint: b,
  shell_escape: h,
  load_shell_handler_script: k,
  read_project_files: w,
  write_texlive_remote_files: S,
  write_texlive_remote_misses: y
} }) => {
  if (l && r) {
    try {
      self.pipeline = new BusytexPipeline(
        r,
        l,
        d || [],
        _ || [],
        g || [],
        (msg) => {
          postMessage({ print: msg });
        },
        (ver) => postMessage({ initialized: ver }),
        x,
        BusytexPipeline.ScriptLoaderWorker,
        n,
        o,
        c
      );
    } catch (err) {
      postMessage({ exception: "Exception during initialization: " + err.toString() + "\\nStack:\\n" + err.stack });
    }
  } else if (k) {
    try {
      importScripts(k);
      self.handler_ready && (await self.handler_ready);
      postMessage({ shell_handler_script_loaded: k });
    } catch (err) {
      postMessage({ exception: "Exception loading shell handler script: " + err.toString() + "\\nStack:\\n" + err.stack });
    }
  } else if (w && self.pipeline) {
    try {
      postMessage({ project_files: await self.pipeline.read_project_files(w.dir || null) });
    } catch (err) {
      postMessage({ exception: "Exception reading project files: " + err.toString() + "\\nStack:\\n" + err.stack });
    }
  } else if (S && self.pipeline) {
    try {
      await self.pipeline.write_texlive_remote_files(S);
      postMessage({ texlive_remote_written: true });
    } catch (err) {
      postMessage({ exception: "Exception writing remote files: " + err.toString() + "\\nStack:\\n" + err.stack });
    }
  } else if (y && self.pipeline) {
    try {
      await self.pipeline.write_texlive_remote_misses(y);
      postMessage({ texlive_remote_misses_written: true });
    } catch (err) {
      postMessage({ exception: "Exception writing remote misses: " + err.toString() + "\\nStack:\\n" + err.stack });
    }
  } else if (e && self.pipeline) {
    try {
      const res = await self.pipeline.compile(e, t, i, s, a, p, f, m, d, b, true === h);
      postMessage(res);
    } catch (err) {
      postMessage({ exception: "Exception during compilation: " + err.toString() + "\\nStack:\\n" + err.stack });
    }
  }
};
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  return new Worker(blobUrl);
}

async function getInitializedXeLatex(): Promise<XeLatex> {
  if (!cachedRunner) {
    const binaryPaths = COMPILER_BINARY_ASSETS;
    const binaryEntries = await Promise.all(
      binaryPaths.map(
        async (path) => [path, await getBinaryAssetFromDB(path)] as const,
      ),
    );
    const binaries: Record<string, Uint8Array> = {};
    for (const path of binaryPaths) {
      const bytes = binaryEntries.find(
        ([entryPath]) => entryPath === path,
      )?.[1];
      if (!bytes) {
        throw new Error(`Compiler binary missing from local bundle: ${path}`);
      }
      binaries[path] = bytes;
    }
    const blobUrl = (bytes: Uint8Array, type: string) => {
      const buffer = bytes.slice().buffer as ArrayBuffer;
      return URL.createObjectURL(new Blob([buffer], { type }));
    };
    const packageUrl = "https://exam-studio.local/texlive-basic.js";
    const packageDataUrl = "https://exam-studio.local/texlive-basic.data";
    const assetUrls = {
      busytexJs: blobUrl(
        binaries["engine/busytex.js"],
        "application/javascript",
      ),
      busytexWasm: blobUrl(binaries["engine/busytex.wasm"], "application/wasm"),
      busytexPipeline: blobUrl(
        binaries["engine/busytex_pipeline.js"],
        "application/javascript",
      ),
      [packageUrl]: blobUrl(
        binaries["packages/texlive-basic.js"],
        "application/javascript",
      ),
      [packageDataUrl]: blobUrl(
        binaries["packages/texlive-basic.data"],
        "application/octet-stream",
      ),
    };
    const innerWorker = await createCORSWorker(assetUrls);

    cachedRunner = new BusyTexRunner({
      busytexBasePath: BUSYTEX_LOCAL_BASE,
      engineMode: "combined",
      verbose: false,
      preloadDataPackages: VALID_PRELOAD_PACKAGES,
    });

    const runner = cachedRunner as any;
    runner.worker = innerWorker;

    await new Promise<void>((resolve, reject) => {
      const worker = innerWorker;

      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for BusyTeX worker initialization"));
      }, 180000);

      worker.onmessage = ({ data }: MessageEvent) => {
        if (data.initialized) {
          clearTimeout(timeout);
          runner.initialized = true;
          resolve();
        } else if (data.exception) {
          clearTimeout(timeout);
          reject(new Error(data.exception));
        } else if (data.print) {
          runner.reportDownloadProgress(data.print);
        }
      };

      worker.onerror = (err) => {
        clearTimeout(timeout);
        reject(
          new Error(
            `BusyTeX worker initialization error: ${err.message || "Failed to load script"}`,
          ),
        );
      };

      worker.postMessage({
        busytex_js: assetUrls.busytexJs,
        busytex_wasm: assetUrls.busytexWasm,
        biber_js: null,
        biber_wasm: null,
        biber_data: null,
        preload_data_packages_js: [packageUrl],
        data_packages_js: [],
        texmf_local: [],
        preload: true,
      });
    });
  }

  const xelatex = new XeLatex(cachedRunner);
  (xelatex as any).runner.initialized = true;
  return xelatex;
}

ctx.addEventListener(
  "message",
  async (event: MessageEvent<WorkerInMessage>) => {
    const data = event.data;
    if (data.type !== "COMPILE_EXAM") return;
    const { id, jsonInput, options } = data;

    const milestoneLogs: CompilerLogEntry[] = [];
    const startTime = Date.now();

    const logMilestone = (
      stage: CompilerStage,
      progressPercent: number,
      message: string,
      logType: CompilerLogEntry["type"] = "info",
    ) => {
      const log = createLog(stage, message, logType);
      milestoneLogs.push(log);
      ctx.postMessage({
        type: "PROGRESS",
        id,
        stage,
        progressPercent,
        log,
      });
    };

    try {
      logMilestone("preparing", 15, "Validating exam JSON schema...", "info");

      const bundleResult = compileExamToLatexBundle(jsonInput, options);
      if (!bundleResult.success) {
        throw new Error(
          "JSON Validation Failed:\n" + bundleResult.errors.join("\n"),
        );
      }

      const { bundle } = bundleResult;
      logMilestone(
        "preparing",
        25,
        "Generated modular LaTeX source streams.",
        "success",
      );

      // Retrieve preloaded Kalpurush font strictly from IndexedDB (0 network calls)
      const fontBytes = await getCachedKalpurushFont();
      logMilestone(
        "preparing",
        35,
        "Mounted Kalpurush Bengali OpenType font from local cache.",
        "success",
      );

      // Initialize cached in-browser WASM XeLaTeX engine from IndexedDB (0 network calls)
      const xelatex = await getInitializedXeLatex();
      logMilestone(
        "preparing",
        45,
        "Loaded WebAssembly TeX Live engine from local storage.",
        "success",
      );

      const cachedStyles = await getStylesFromDB();
      const styleFiles: FileInput[] = Object.entries(cachedStyles).map(
        ([path, content]) => ({ path, content }),
      );

      // Shared filesystem assets for all passes
      const commonFiles: FileInput[] = [
        { path: "config.tex", content: bundle.configTex },
        { path: "preamble.tex", content: PREAMBLE_TEX },
        { path: "Kalpurush.ttf", content: fontBytes },
        ...styleFiles,
      ];

      // ==========================================
      // PASS 1: Compile CQ + SQ (Portrait A5)
      // ==========================================
      logMilestone(
        "compiling_cq_sq",
        55,
        "Compiling Creative & Short Questions (Portrait A5)...",
        "info",
      );

      const cqSqFiles: FileInput[] = [
        ...commonFiles,
        { path: "cq_sq_a5.tex", content: CQ_SQ_A5_TEX },
        { path: "sections/cq_questions.tex", content: bundle.cqTex },
        { path: "sections/sq_questions.tex", content: bundle.sqTex },
      ];

      const cqSqResult = await xelatex.compile({
        input: CQ_SQ_A5_TEX,
        mainTexPath: "cq_sq_a5.tex",
        additionalFiles: cqSqFiles,
        dataPackagesJs: [],
      });

      if (!cqSqResult.success || !cqSqResult.pdf) {
        const parsedErr = extractLatexError(cqSqResult.log || "");
        throw new Error("XeLaTeX CQ+SQ Error:\n" + parsedErr);
      }

      const rawCqSqBytes = cqSqResult.pdf;
      logMilestone(
        "compiling_cq_sq",
        68,
        "Compiled cq_sq_a5.pdf successfully.",
        "success",
      );

      // ==========================================
      // PASS 2: In-Memory 2x1 Landscape Booklet Imposition
      // ==========================================
      logMilestone(
        "imposing_booklet",
        75,
        "Imposing A5 pages into 2x1 Landscape A4 folded booklet...",
        "info",
      );
      const { bookletPdfBytes, sheetCount } =
        await imposeA5ToA4Booklet(rawCqSqBytes);
      logMilestone(
        "imposing_booklet",
        82,
        `Imposed booklet onto ${sheetCount} A4 landscape sheet(s).`,
        "success",
      );

      // ==========================================
      // PASS 3: Compile MCQ (Portrait A4)
      // ==========================================
      logMilestone(
        "compiling_mcq",
        85,
        "Compiling Multiple Choice Questions (Portrait A4)...",
        "info",
      );

      const mcqFiles: FileInput[] = [
        ...commonFiles,
        { path: "main_mcq.tex", content: MAIN_MCQ_TEX },
        { path: "sections/mcq_questions.tex", content: bundle.mcqTex },
      ];

      const mcqResult = await xelatex.compile({
        input: MAIN_MCQ_TEX,
        mainTexPath: "main_mcq.tex",
        additionalFiles: mcqFiles,
        dataPackagesJs: [],
      });

      if (!mcqResult.success || !mcqResult.pdf) {
        const parsedErr = extractLatexError(mcqResult.log || "");
        throw new Error("XeLaTeX MCQ Error:\n" + parsedErr);
      }

      const rawMcqBytes = mcqResult.pdf;
      logMilestone(
        "compiling_mcq",
        90,
        "Compiled main_mcq.pdf successfully.",
        "success",
      );

      // ==========================================
      // PASS 4 (Optional): Compile MCQ Solutions (Portrait A4)
      // ==========================================
      let rawSolBytes: Uint8Array | undefined = undefined;
      if (bundle.solTex && bundle.solTex.trim()) {
        logMilestone(
          "compiling_sol",
          92,
          "Compiling MCQ Solutions & Answer Explanations (Portrait A4)...",
          "info",
        );

        const solFiles: FileInput[] = [
          ...commonFiles,
          { path: "main_mcq_sol.tex", content: MAIN_MCQ_SOL_TEX },
          { path: "sections/mcq_solutions.tex", content: bundle.solTex },
        ];

        const solResult = await xelatex.compile({
          input: MAIN_MCQ_SOL_TEX,
          mainTexPath: "main_mcq_sol.tex",
          additionalFiles: solFiles,
          dataPackagesJs: [],
        });

        if (solResult.success && solResult.pdf) {
          rawSolBytes = solResult.pdf;
          logMilestone(
            "compiling_sol",
            95,
            "Compiled main_mcq_sol.pdf successfully.",
            "success",
          );
        }
      }

      // ==========================================
      // PASS 5: Stitch into Master Complete Document
      // ==========================================
      logMilestone(
        "merging_master",
        97,
        "Merging Booklet, MCQ, and Solutions into Master Document...",
        "info",
      );

      const masterPdfBytes = await mergeExamDocuments(
        bookletPdfBytes,
        rawMcqBytes,
        rawSolBytes,
      );

      const totalPageCount = sheetCount + 1 + (rawSolBytes ? 1 : 0);
      const durationMs = Date.now() - startTime;
      logMilestone(
        "complete",
        100,
        `Compilation finished in ${(durationMs / 1000).toFixed(1)}s (Total Pages: ${totalPageCount}).`,
        "success",
      );

      ctx.postMessage({
        type: "SUCCESS",
        id,
        result: {
          success: true,
          masterPdfBytes,
          cqSqPdfBytes: bookletPdfBytes,
          mcqPdfBytes: rawMcqBytes,
          solPdfBytes: rawSolBytes,
          pageCount: totalPageCount,
          logs: milestoneLogs,
          durationMs,
        },
      });
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      logMilestone("error", 100, errorMessage, "error");

      ctx.postMessage({
        type: "ERROR",
        id,
        error: errorMessage,
        logs: milestoneLogs,
      });
    }
  },
);
