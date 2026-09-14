import {
  PRESETS,
  FIELD_ALIASES,
  SUBQ_LABELS,
  THREE_SUBQUESTION_MARKS,
  FOUR_SUBQUESTION_MARKS,
  toBanglaNum,
  type PresetDefaults,
} from "./presets";
import type {
  ExamData,
  CqQuestion,
  McqQuestion,
  CompileOptions,
} from "./types";

// Simple seeded pseudo-random number generator (Mulberry32)
function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with custom RNG
function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateConfigTex(data: ExamData, options: CompileOptions = {}): string {
  const presetKey = data.preset || "ssc_math";
  const presetDefaults: PresetDefaults = PRESETS[presetKey] || PRESETS.ssc_math;

  const rawMeta = data.metadata || {};
  const meta: Record<string, any> =
    Object.keys(rawMeta).length > 0
      ? rawMeta
      : Object.fromEntries(
          Object.entries(data).filter(
            ([k]) => !["preset", "cqSections", "shortQuestions", "mcqQuestions"].includes(k)
          )
        );

  function getVal(key: string, defaultFallback = ""): string {
    const possibleKeys = FIELD_ALIASES[key] || [key];
    for (const k of possibleKeys) {
      if (k in meta && meta[k] !== undefined && meta[k] !== null && String(meta[k]).trim() !== "") {
        return String(meta[k]);
      }
      if (k in data && (data as any)[k] !== undefined && (data as any)[k] !== null && String((data as any)[k]).trim() !== "") {
        return String((data as any)[k]);
      }
    }
    return (presetDefaults as any)[key] ?? defaultFallback;
  }

  const setSuffix = options.setName ? ` (সেট: ${options.setName})` : "";

  return `% ==============================================================================
% AUTO-GENERATED EXAM CONFIGURATION FROM JSON
% ==============================================================================
\\newcommand{\\instituename}{${getVal("institute")}}
\\newcommand{\\examname}{${getVal("examName")}${setSuffix}}
\\newcommand{\\subjectname}{${getVal("subject")}}
\\newcommand{\\classname}{${getVal("class")}}
\\newcommand{\\examdate}{${getVal("year")}}

% --- CQ + SQ Settings ---
\\newcommand{\\cqsqheadertext}{\\examname\\ – \\subjectname}
\\newcommand{\\cqsqtimetext}{${getVal("cqTime")}}
\\newcommand{\\cqsqmarkstext}{${getVal("cqMarks")}}
\\newcommand{\\cqtitletext}{${getVal("cqTitle")}}
\\newcommand{\\cqinstructiontext}{${getVal("cqInstruction")}}
\\newcommand{\\sqtitletext}{${getVal("sqTitle")}}
\\newcommand{\\sqinstructiontext}{${getVal("sqInstruction")}}

% --- MCQ Settings ---
\\newcommand{\\mcqheadertext}{\\examname\\ – \\subjectname}
\\newcommand{\\mcqtimetext}{${getVal("mcqTime")}}
\\newcommand{\\mcqmarkstext}{${getVal("mcqMarks")}}
\\newcommand{\\mcqtitletext}{${getVal("mcqTitle")}}
\\newcommand{\\mcqinstructiontext}{${getVal("mcqInstruction")}}

% --- MCQ Solution Settings ---
\\newcommand{\\mcqsoltitletext}{${getVal("mcqSolTitle")}}
`;
}

function formatCqQuestion(q: CqQuestion, autoNum?: string): string {
  const lines: string[] = ["\\begin{cqitem}"];
  const qNum = q.number || autoNum || "";

  let stems: string[] = [];
  if (q.stems && q.stems.length > 0) {
    stems = q.stems;
  } else if (q.stem) {
    stems = [q.stem];
  }
  const stemText = stems.join(" \\\\\n");
  lines.push(`\\cqheader{${qNum}}{${stemText}}`);

  if (q.table) {
    const headers = q.table.headers || [];
    const colsFmt = "|l|" + "c|".repeat(Math.max(0, headers.length - 1));
    lines.push("\\begin{center}");
    lines.push("\\vspace{-3pt}");
    lines.push(`\\begin{tabular}{${colsFmt}}`);
    lines.push("\\hline");
    lines.push(`\\textbf{${headers[0] || ""}} & ` + headers.slice(1).join(" & ") + " \\\\ \\hline");
    for (const row of q.table.rows || []) {
      lines.push(`\\textbf{${row[0] || ""}} & ` + row.slice(1).join(" & ") + " \\\\ \\hline");
    }
    lines.push("\\end{tabular}");
    lines.push("\\vspace{-3pt}");
    lines.push("\\end{center}");
  }

  const subQuestions = q.subQuestions || q.subs || [];
  const defaultMarks =
    subQuestions.length === 3
      ? THREE_SUBQUESTION_MARKS
      : subQuestions.length === 4
      ? FOUR_SUBQUESTION_MARKS
      : [];

  for (let idx = 0; idx < subQuestions.length; idx++) {
    const sq = subQuestions[idx];
    if (typeof sq === "string") {
      const sLabel = idx < SUBQ_LABELS.length ? SUBQ_LABELS[idx] : "";
      const sMark = idx < defaultMarks.length ? defaultMarks[idx] : "৪";
      lines.push(`\\subq{${sLabel}}{${sq}}{${sMark}}`);
    } else {
      const sLabel = sq.label || (idx < SUBQ_LABELS.length ? SUBQ_LABELS[idx] : "");
      const sMark = sq.mark || (idx < defaultMarks.length ? defaultMarks[idx] : "৪");
      lines.push(`\\subq{${sLabel}}{${sq.text || ""}}{${sMark}}`);
    }
  }

  lines.push("\\end{cqitem}\n");
  return lines.join("\n");
}

export function generateCqTex(data: ExamData): string {
  const cqSections = data.cqSections || [];
  const lines: string[] = [
    "% ==============================================================================",
    "% AUTO-GENERATED CREATIVE QUESTIONS (সৃজনশীল প্রশ্ন) FROM JSON",
    "% ==============================================================================",
    "",
  ];

  let globalCqCount = 1;
  for (const sec of cqSections) {
    const secName = sec.sectionName || sec.name || "";
    lines.push(`\\cqsection{${secName}}\n`);
    for (const q of sec.questions || []) {
      const autoNum = toBanglaNum(globalCqCount);
      lines.push(formatCqQuestion(q, autoNum));
      globalCqCount++;
    }
  }

  return lines.join("\n");
}

export function generateSqTex(data: ExamData): string {
  const sqs = data.shortQuestions || [];
  const lines: string[] = [
    "% ==============================================================================",
    "% AUTO-GENERATED SHORT QUESTIONS (সংক্ষিপ্ত প্রশ্ন) FROM JSON",
    "% ==============================================================================",
    "",
  ];

  for (let idx = 0; idx < sqs.length; idx++) {
    const sq = sqs[idx];
    let num: string;
    let text: string;
    if (typeof sq === "string") {
      num = toBanglaNum(idx + 1);
      text = sq;
    } else {
      num = sq.number || toBanglaNum(idx + 1);
      text = sq.text || "";
    }
    lines.push(`\\sqitem{${num}}{${text}}`);
  }

  return lines.join("\n");
}

interface PreparedMcq {
  origIndex: number;
  qNum: string;
  newNumber: string;
  qText: string;
  choices: string[];
  ans: string;
  exp: string;
  stems?: string[];
  context?: McqQuestion["context"];
}

function prepareNormalizedMcqs(
  data: ExamData,
  options: CompileOptions = {}
): PreparedMcq[] {
  const rawList = data.mcqQuestions || [];
  const normalized: PreparedMcq[] = rawList.map((q, idx) => ({
    origIndex: idx + 1,
    qNum: q.number || toBanglaNum(idx + 1),
    newNumber: q.number || toBanglaNum(idx + 1),
    qText: q.q || q.text || "",
    choices: q.opts || q.choices || [],
    ans: q.ans || q.answer || "",
    exp: q.exp || q.explanation || "",
    stems: q.stems,
    context: q.context,
  }));

  if (options.shuffleMcq) {
    const seed = options.seed ?? 42;
    const rng = createSeededRandom(seed);
    const shuffled = shuffleArray(normalized, rng);
    for (let idx = 0; idx < shuffled.length; idx++) {
      shuffled[idx].newNumber = toBanglaNum(idx + 1);
    }
    return shuffled;
  }

  return normalized;
}

export function generateMcqTex(data: ExamData, options: CompileOptions = {}): string {
  const mcqList = prepareNormalizedMcqs(data, options);
  const lines: string[] = [
    "% ==============================================================================",
    "% AUTO-GENERATED MCQ QUESTIONS FROM JSON",
    "% ==============================================================================",
    "",
  ];

  for (const q of mcqList) {
    lines.push("\\begin{mcqitem}");
    if (q.context) {
      const ctxTitle = q.context.title || "";
      const ctxStem = q.context.stem || "";
      let tableLatex = "";
      if (q.context.table) {
        const h = q.context.table.headers || [];
        const colsFmt = "|l|" + "c|".repeat(Math.max(0, h.length - 1));
        tableLatex = `\\begin{center}\\vspace{1pt}\\begin{tabular}{${colsFmt}}\\hline `;
        tableLatex += `\\textbf{${h[0] || ""}} & ` + h.slice(1).join(" & ") + " \\\\ \\hline ";
        for (const row of q.context.table.rows || []) {
          tableLatex += `\\textbf{${row[0] || ""}} & ` + row.slice(1).join(" & ") + " \\\\ \\hline ";
        }
        tableLatex += "\\end{tabular}\\vspace{1pt}\\end{center}";
      }
      lines.push(`\\mcqstem{${ctxTitle}}{${ctxStem} ${tableLatex}}`);
    }

    lines.push(`\\mcqq{${q.newNumber}}{${q.qText}}`);

    if (q.stems && q.stems.length > 0) {
      lines.push("\\begin{multistem}");
      for (const s of q.stems) {
        lines.push(`  \\item ${s}`);
      }
      lines.push("\\end{multistem}");
    }

    if (q.choices && q.choices.length >= 4) {
      lines.push(
        `\\autochoices{${q.choices[0]}}{${q.choices[1]}}{${q.choices[2]}}{${q.choices[3]}}`
      );
    }

    lines.push("\\end{mcqitem}\n");
  }

  return lines.join("\n");
}

export function generateSolTex(data: ExamData, options: CompileOptions = {}): string {
  const mcqList = prepareNormalizedMcqs(data, options);
  const lines: string[] = [
    "% ==============================================================================",
    "% AUTO-GENERATED MCQ SOLUTIONS TABLE FROM JSON",
    "% ==============================================================================",
    "\\begin{multicols}{2}",
    "\\small",
    "",
  ];

  const half = Math.floor((mcqList.length + 1) / 2);
  const table1 = mcqList.slice(0, half);
  const table2 = mcqList.slice(half);

  const tables = [table1, table2];
  for (let tblIdx = 0; tblIdx < tables.length; tblIdx++) {
    const tblData = tables[tblIdx];
    lines.push("\\noindent");
    lines.push("\\begin{tabular}{|c|c|>{\\raggedright\\arraybackslash}p{6.4cm}|}");
    lines.push("\\hline");
    lines.push("\\textbf{প্রশ্ন} & \\textbf{উত্তর} & \\textbf{সংক্ষিপ্ত ব্যাখ্যা / হিসাব} \\\\ \\hline");

    for (const q of tblData) {
      lines.push(`\\textbf{${q.newNumber}} & \\textbf{(${q.ans})} & ${q.exp} \\\\ \\hline`);
    }

    lines.push("\\end{tabular}\n");
    if (tblIdx === 0) {
      lines.push("\\vfill\\null\n\\columnbreak\n");
    }
  }

  lines.push("\\end{multicols}");
  return lines.join("\n");
}
