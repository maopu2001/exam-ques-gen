"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Atom,
  Calculator,
  Wand2,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";

interface AiPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = "generate" | "format";
type SubjectId = "ssc_physics" | "ssc_hmath" | "ssc_math";

// ============================================================================
// 1. XELATEX FORMATTER PROMPT
// ============================================================================

const ORIGINAL_XELATEX_FORMATTER_PROMPT = `You are an expert LaTeX exam parser and JSON formatting engine. Your task is to extract, convert, and format exam questions into a single valid, well-structured JSON document for an automated XeLaTeX exam compilation pipeline.

### OUTPUT REQUIREMENTS:
1. Return ONLY pure, valid JSON inside a single \`\`\`json ... \`\`\` code block.
2. No commentary, introduction, or extra markdown outside the code block.
3. CRITICAL: DOUBLE ESCAPE EVERY BACKSLASH (\\\\) for all LaTeX commands (\\\\frac, \\\\sqrt, \\\\text, \\\\times, \\\\pm, \\\\theta, \\\\implies, \\\\angle, \\\\circ, \\\\alpha, \\\\beta, \\\\le, \\\\ge, \\\\ne, \\\\cup, \\\\cap, \\\\subset, \\\\mathbb{N}, \\\\Delta). Single backslash \\ will break JSON parsing.
4. Wrap all mathematical expressions in LaTeX inline math mode $ ... $.
5. Keep Bengali digits (০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯) or English digits consistent with original text.

---

### BACKSLASH ESCAPING CHEATSHEET (MANDATORY IN JSON):

| Raw LaTeX | Valid JSON String |
| :--- | :--- |
| \\frac{a}{b} | "\\\\frac{a}{b}" |
| \\sqrt{x} | "\\\\sqrt{x}" |
| \\text{cm} | "\\\\text{cm}" |
| \\times | "\\\\times" |
| \\pm | "\\\\pm" |
| \\theta | "\\\\theta" |
| \\alpha, \\beta | "\\\\alpha", "\\\\beta" |
| \\implies | "\\\\implies" |
| \\ne, \\le, \\ge | "\\\\ne", "\\\\le", "\\\\ge" |
| \\circ | "\\\\circ" |
| \\angle | "\\\\angle" |
| \\Delta | "\\\\Delta" |
| \\{1, 2\\} | "\\\\{1, 2\\\\}" |
| \\quad \\textbar \\quad | "\\\\quad \\\\textbar \\\\quad" |
| \\\\ (LaTeX line break) | "\\\\\\\\" |

---

### SPECIFIC QUESTION TYPE RULES:

1. **Multi-Statement MCQs (বহুপদী সমাপ্তিসূচক বহুনির্বাচনী)**:
   - In "stems", provide clean statements WITHOUT i., ii., iii. prefixes (the template automatically numbers them with roman numerals).
   - In "q", write the prompt ending with dash/colon (e.g., "$f(x)$ ফাংশনের ক্ষেত্রে—").
   - DO NOT include "নিচের কোনটি সঠিক?" in "q" or "stems" — the template prints this automatically.

2. **Context-Based MCQs (উদ্দীপক / তথ্য / সারণিভিত্তিক প্রশ্ন)**:
   - Place the "context" object ONLY on the FIRST question of the group.
   - The subsequent related question(s) omit "context" and only have "q", "opts", "ans", "exp".
   - "title" in context MUST be specific to the question range, e.g.:
     - "নিচের তথ্যের আলোকে ১৬ ও ১৭ নম্বর প্রশ্নের উত্তর দাও:"
     - "নিচের সারণির আলোকে ২৫ ও ২৬ নম্বর প্রশ্নের উত্তর দাও:"
     - "নিচের চিত্রের আলোকে ৮ ও ৯ নম্বর প্রশ্নের উত্তর দাও:"

3. **MCQ Options (opts)**:
   - Clean array of 4 options WITHOUT ক), খ), (A) prefixes.

4. **MCQ Answers (ans)**:
   - Single Bangla letter "ক", "খ", "গ", or "ঘ".

5. **CQ Subquestions (subs)**:
   - Plain array of 3 or 4 strings. DO NOT add ক), খ), গ) — the template assigns labels and standard marks (2, 4, 4 or 1, 2, 3, 4) automatically.

---

### TARGET JSON SCHEMA:

\`\`\`json
{
  "preset": "ssc_math",
  "metadata": {
    "institute": "প্রতিষ্ঠানের নাম / Institute Name",
    "examName": "পরীক্ষার নাম / Exam Name",
    "subject": "বিষয় / Subject",
    "class": "শ্রেণি / Class",
    "year": "২০২৫",
    "cqTime": "২ ঘণ্টা ৩০ মিনিট",
    "cqMarks": "৭০",
    "cqTitle": "সৃজনশীল প্রশ্ন – ৫০ নম্বর",
    "cqInstruction": "প্রতি বিভাগ থেকে অন্তত ১টি করে মোট ৫টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০",
    "sqTitle": "সংক্ষিপ্ত প্রশ্ন – ২০ নম্বর",
    "sqInstruction": "যেকোনো ১০টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ২",
    "mcqTime": "৩০ মিনিট",
    "mcqMarks": "৩০",
    "mcqTitle": "বহুনির্বাচনী প্রশ্ন",
    "mcqInstruction": "সকল প্রশ্নের সঠিক/সর্বোৎকৃষ্ট উত্তর দাও। প্রতিটি প্রশ্নের মান সমান",
    "mcqSolTitle": "\\\\examname\\\\ – \\\\subjectname\\\\ (বহুনির্বাচনী উত্তরমালা ও সংক্ষিপ্ত ব্যাখ্যা)"
  },
  "cqSections": [
    {
      "sectionName": "ক বিভাগ (বীজগণিত)",
      "questions": [
        {
          "stems": [
            "$P = x^2 - 3x + 2$ এবং $Q = x^3 - 8$ দুটি বীজগাণিতিক রাশি।",
            "$f(x) = \\\\frac{2x+1}{2x-1}$ একটি ফাংশন।"
          ],
          "subs": [
            "উদ্দীপক হতে $P = 0$ হলে $x + \\\\frac{2}{x}$ এর মান নির্ণয় কর।",
            "প্রমাণ কর যে, $Q = (x-2)(x^2+2x+4)$।",
            "$f(a) = 3$ হলে $a$ এর মান নির্ণয় কর এবং $f^{-1}(2)$ এর মান বের কর।"
          ]
        },
        {
          "stems": [
            "একটি শ্রেণির ৫০ জন শিক্ষার্থীর গণিত বিষয়ে প্রাপ্ত নম্বরের গণসংখ্যা নিবেশন সারণি নিচে দেওয়া হলো:"
          ],
          "table": {
            "headers": ["শ্রেণি ব্যাপ্তি", "৩১-৪০", "৪১-৫০", "৫১-৬০", "৬১-৭০", "৭১-৮০"],
            "rows": [
              ["গণসংখ্যা", "৬", "৮", "১০", "১২", "১৪"]
            ]
          },
          "subs": [
            "প্রচুরক শ্রেণির মধ্যমান নির্ণয় কর।",
            "সারণি থেকে সংক্ষিপ্ত পদ্ধতিতে গড় নির্ণয় কর।",
            "প্রদত্ত উপাত্তের গণসংখ্যা বহুভুজ আঁক।"
          ]
        }
      ]
    }
  ],
  "shortQuestions": [
    "$\\\\sqrt{5}$ একটি কোন ধরনের সংখ্যা?",
    "যদি $\\\\log_x 25 = 2$ হয়, তবে $x$ এর মান কত?",
    "একটি সমবাহু ত্রিভুজের বাহুর দৈর্ঘ্য $4\\\\text{ cm}$ হলে এর ক্ষেত্রফল কত?"
  ],
  "mcqQuestions": [
    {
      "q": "যদি $x + \\\\frac{1}{x} = 2$ হয়, তবে $x^4 + \\\\frac{1}{x^4}$ এর মান কত?",
      "opts": ["0", "2", "4", "16"],
      "ans": "খ",
      "exp": "$x + \\\\frac{1}{x} = 2 \\\\implies x = 1$। সুতরাং $x^4 + \\\\frac{1}{x^4} = 1 + 1 = 2$।"
    },
    {
      "q": "সূচকীয় ফাংশনের ক্ষেত্রে—",
      "stems": [
        "$a^0 = 1$ (যেখানে $a \\\\ne 0$)",
        "$a^{-n} = \\\\frac{1}{a^n}$ (যেখানে $a \\\\ne 0, n \\\\in \\\\mathbb{N}$)",
        "$\\\\sqrt[n]{a} = a^{\\\\frac{1}{n}}$"
      ],
      "opts": ["i ও ii", "i ও iii", "ii ও iii", "i, ii ও iii"],
      "ans": "ঘ",
      "exp": "তিনটি উক্তিই সূচকের মৌলিক সূত্র অনুযায়ী সত্য।"
    },
    {
      "context": {
        "title": "নিচের তথ্যের আলোকে ১৬ ও ১৭ নম্বর প্রশ্নের উত্তর দাও:",
        "stem": "একটি নিরেট সমবৃত্তভূমিক কোণকের উচ্চতা $12\\\\text{ cm}$ এবং ভূমির ব্যাসার্ধ $5\\\\text{ cm}$।"
      },
      "q": "কোণকটির হেলানো উচ্চতা কত সে.মি.?",
      "opts": ["10", "13", "15", "$\\\\sqrt{119}$"],
      "ans": "খ",
      "exp": "হেলানো উচ্চতা $l = \\\\sqrt{h^2+r^2} = \\\\sqrt{12^2+5^2} = \\\\sqrt{169} = 13\\\\text{ cm}$।"
    },
    {
      "q": "কোণকটিকে গলিয়ে সমান ভূমির ব্যাসার্ধবিশিষ্ট একটি নিরেট বেলনে রূপান্তর করা হলে বেলনটির উচ্চতা কত সে.মি. হবে?",
      "opts": ["3", "4", "6", "8"],
      "ans": "খ",
      "exp": "কোণকের আয়তন $= \\\\frac{1}{3}\\\\pi r^2 h = 100\\\\pi$। বেলনের উচ্চতা $H = 4\\\\text{ cm}$।"
    },
    {
      "context": {
        "title": "নিচের সারণির আলোকে ২৫ ও ২৬ নম্বর প্রশ্নের উত্তর দাও:",
        "stem": "কোনো শ্রেণির ৬০ জন শিক্ষার্থীর গণিত বিষয়ে প্রাপ্ত নম্বরের সারণি:",
        "table": {
          "headers": ["শ্রেণি", "৩১-৪০", "৪১-৫০", "৫১-৬০"],
          "rows": [
            ["গণসংখ্যা", "১০", "২০", "৩০"]
          ]
        }
      },
      "q": "মধ্যক শ্রেণির ঊর্ধ্বসীমা কত?",
      "opts": ["৪০", "৫০", "৬০", "৭০"],
      "ans": "খ",
      "exp": "ক্রমযোজিত গণসংখ্যা অনুসারে মধ্যক শ্রেণি ৪১-৫০, ঊর্ধ্বসীমা ৫০।"
    },
    {
      "q": "প্রচুরক শ্রেণি কোনটি?",
      "opts": ["৩১-৪০", "৪১-৫০", "৫১-৬০", "কোনোটিই নয়"],
      "ans": "গ",
      "exp": "সর্বোচ্চ গণসংখ্যা ৩০ থাকায় প্রচুরক শ্রেণি ৫১-৬০।"
    }
  ]
}
\`\`\``;

// ============================================================================
// 2. 3 SUBJECT QUESTION GENERATION PROMPTS (Physics, Higher Math, General Math)
// ============================================================================

const PROMPT_GEN_PHYSICS = `Suppose you are an Expert Physics Teacher of SSC standard in Bangladesh following the NCTB curriculum. Create an original question set comprising 7 CQ, 7 SQ, and 25 MCQ strictly adhering to the SSC cognitive domain structure.

[Target Chapters: All chapters / Specify specific chapters here if needed]
*Note: If no specific chapters are listed above, autonomously select and balance topics across mechanics, thermodynamics, waves/optics, and electricity/modern physics.

General Rules:
1. Avoid clichés from past board exams; construct fresh physical scenarios and realistic experimental data.
2. Maintain strict NCTB SSC Physics textbook scope (no HSC-level calculus or advanced vector calculus).
3. Every Creative Question (CQ) must strictly follow the official 4-tier cognitive sub-question format:
   - (ক) জ্ঞানমূলক (Knowledge) [১ নম্বর] — Direct definition, law, or unit.
   - (খ) অনুধাবনমূলক (Comprehension) [২ নম্বর] — Conceptual "why" or "explain" question.
   - (গ) প্রয়োগমূলক (Application) [৩ নম্বর] — Direct numerical calculation using stem data.
   - (ঘ) উচ্চতর দক্ষতামূলক (Higher Ability / Analysis) [৪ নম্বর] — Comparative analysis, evaluation, or feasibility test.

CQ Distribution (7 CQs in total):
- 3 Mixed-Chapter CQs: Seamlessly pair two naturally related topics.
- 4 Single-Chapter CQs: Deep dives into core single-chapter phenomena.

SQ Distribution (7 Short Questions in total):
- 4 Proofs/Derivations: Formal mathematical derivations of fundamental formulas strictly within textbook boundaries (e.g., $E_k = \frac{1}{2}mv^2$, equivalent resistances, or mirror equation relations).
- 3 Conceptual Questions: Insightful qualitative questions evaluating underlying physical principles.

MCQ Distribution (25 Multiple Choice Questions in total):
- 4 Context-based / Stimulus-based (অভিন্ন তথ্যভিত্তিক): 2 stems with 2 dependent questions each.
- 4 Multiple-completion (বহুপদী সমাপ্তিসূচক): Statements (i, ii, iii) with combinations.
- 12 Mathematical MCQs: 1–2 step quantitative problems.
- 13 Conceptual MCQs: Testing laws, SI units, dimensions, and qualitative phenomena.

Output: Provide the questions in Bengali (or English Version if specified). Include a complete answer key with full mathematical steps and marking breakdowns.`;

const PROMPT_GEN_HMATH = `Suppose you are an Expert Higher Mathematics Teacher of SSC standard in Bangladesh following the NCTB curriculum. Create an original question set comprising 7 CQ, 7 SQ, and 25 MCQ strictly following the official SSC Higher Math section structure (বিভাগ).

[Target Chapters: All chapters / Specify specific chapters here if needed]
*Note: If no specific chapters are listed above, autonomously choose and balance topics across the 3 official sections.

General Rules:
1. Create novel algebraic models, coordinate setups, and geometric configurations without copying past board questions.
2. Strictly maintain the scope of the NCTB SSC Higher Math syllabus (no HSC calculus, determinants, or 3D cross products).
3. Every Creative Question (CQ) must strictly follow the standard 3-tier sub-question scheme:
   - (ক) প্রাথমিক প্রয়োগ / জ্ঞানমূলক [২ নম্বর]
   - (খ) মূল সমাধান / প্রতিপাদন [৪ নম্বর]
   - (গ) উচ্চতর সংশ্লেষণ / প্রমাণ [৪ নম্বর]

Section-wise CQ Distribution (7 CQs in total):
Organize the 7 CQs (3 mixed-chapter, 4 single-chapter) across the 3 official SSC Higher Math sections:
- 'ক' বিভাগ (বীজগণিত / Algebra) — 3 CQs
- 'খ' বিভাগ (জ্যামিতি, ভেক্টর ও স্থানাঙ্ক জ্যামিতি / Geometry, Vectors & Coordinate Geometry) — 2 CQs
- 'গ' বিভাগ (ত্রিকোণমিতি ও সম্ভাবনা / Trigonometry & Probability) — 2 CQs

SQ Distribution (7 Short Questions in total):
- 4 Proofs/Deductions: Short proofs in vectors, geometric riders, solid geometry properties, or algebraic conditions.
- 3 Conceptual Questions: Deep reasoning questions (e.g., radian measure constants, bijectivity criteria, or axiomatic probability).

MCQ Distribution (25 Multiple Choice Questions in total):
- 4 Context-based / Stimulus-based (অভিন্ন তথ্যভিত্তিক): 2 stems with 2 connected questions each.
- 4 Multiple-completion (বহুপদী সমাপ্তিসূচক): Statements (i, ii, iii) with combinations.
- 12 Mathematical MCQs: Quantitative problems covering coordinates, vector operations, series, binomial expansion, or solid geometry.
- 13 Conceptual MCQs: Testing domain/range, conic/geometric properties, vector conditions, and probability laws.

Output: Provide the questions in Bengali (or English Version if specified). Include a complete answer key with worked-out solutions and proofs.`;

const PROMPT_GEN_MATH = `Suppose you are an Expert General Mathematics Teacher of SSC standard in Bangladesh following the NCTB curriculum. Create an original question set comprising 8 CQ, 15 SQ, and 30 MCQ strictly following the official SSC question pattern and section divisions (বিভাগ).

[Target Chapters: All domains / Specify specific chapters here if needed]
*Note: If no specific chapters are listed above, autonomously select and balance topics across all four official sections.

General Rules:
1. Do not reuse past board exam stems or guidebook clichés; generate fresh, non-routine mathematical scenarios.
2. All problems must be fully solvable using methods within the NCTB SSC General Math textbook (no HSC calculus, matrices, or coordinate geometry).
3. Every Creative Question (CQ) must strictly follow the standard 3-tier sub-question structure:
   - (ক) জ্ঞানমূলক / সরল প্রয়োগ [২ নম্বর]
   - (খ) অনুধাবন / সাধারণ সমাধান বা প্রমাণ [৪ নম্বর]
   - (গ) প্রয়োগ / উচ্চতর বিশ্লেষণ [৪ নম্বর]

Section-wise CQ Distribution (8 CQs in total):
Structure the CQs under the 4 official SSC board sections, maintaining a mix of 4 mixed-chapter and 4 single-chapter questions:
- 'ক' বিভাগ (বীজগণিত / Algebra) — 2 CQs
- 'খ' বিভাগ (জ্যামিতি / Geometry) — 2 CQs
- 'গ' বিভাগ (ত্রিকোণমিতি ও পরিমিতি / Trigonometry & Mensuration) — 2 CQs
- 'ঘ' বিভাগ (পরিসংখ্যান / Statistics) — 2 CQs

SQ Distribution (15 Short Questions in total):
- 8 Proofs/Deductions: Short algebraic identity deductions, geometric rider verifications, and trigonometric relations.
- 7 Conceptual Questions: Non-trivial questions covering definitions, nature of roots/equations, geometric inequalities, and cumulative frequency properties.

MCQ Distribution (30 Multiple Choice Questions in total):
- 6 Context-based / Stimulus-based (অভিন্ন তথ্যভিত্তিক): 3 stems with 2 related questions each.
- 6 Multiple-completion (বহুপদী সমাপ্তিসূচক): Statements (i, ii, iii) with standard combinations.
- 13 Calculation-based MCQs: Direct problem-solving across the 4 domains.
- 17 Conceptual MCQs: Definitions, laws, formulas, and theorem corollaries.

Output: Provide the questions in Bengali (or English Version if specified). Include a complete answer key with step-by-step solutions for CQs and SQs.`;

const GENERATION_PROMPTS: Record<
  SubjectId,
  {
    label: string;
    banglaLabel: string;
    icon: typeof Atom;
    preset: string;
    prompt: string;
  }
> = {
  ssc_physics: {
    label: "SSC Physics",
    banglaLabel: "পদার্থবিজ্ঞান",
    icon: Atom,
    preset: "ssc_physics",
    prompt: PROMPT_GEN_PHYSICS,
  },
  ssc_hmath: {
    label: "SSC Higher Math",
    banglaLabel: "উচ্চতর গণিত",
    icon: Calculator,
    preset: "ssc_hmath",
    prompt: PROMPT_GEN_HMATH,
  },
  ssc_math: {
    label: "SSC General Math",
    banglaLabel: "সাধারণ গণিত",
    icon: BookOpen,
    preset: "ssc_math",
    prompt: PROMPT_GEN_MATH,
  },
};

export function AiPromptDialog({ open, onOpenChange }: AiPromptDialogProps) {
  const [mode, setMode] = useState<Mode>("generate");
  const [subject, setSubject] = useState<SubjectId>("ssc_physics");
  const [copied, setCopied] = useState(false);

  const activePromptText =
    mode === "format"
      ? ORIGINAL_XELATEX_FORMATTER_PROMPT
      : GENERATION_PROMPTS[subject].prompt;

  const activeLabel =
    mode === "format" ? "XeLaTeX Formatter" : GENERATION_PROMPTS[subject].label;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activePromptText);
      setCopied(true);
      toast.success(`${activeLabel} prompt copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0 space-y-2 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              AI Question Prompts & XeLaTeX Formatter
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose whether you want AI to generate a brand new exam or parse an
            existing question paper into XeLaTeX JSON format.
          </DialogDescription>

          {/* Top Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/90 rounded-lg border border-border/80 text-xs">
            <button
              type="button"
              onClick={() => setMode("generate")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-semibold transition-all cursor-pointer ${
                mode === "generate"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wand2 className="size-3.5" />
              <span>Generate Questions (3 Subjects)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("format")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-semibold transition-all cursor-pointer ${
                mode === "format"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCode2 className="size-3.5" />
              <span>XeLaTeX Formatter (Parser)</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        {mode === "generate" ? (
          <Tabs
            value={subject}
            onValueChange={(val) => setSubject(val as SubjectId)}
            className="flex-1 flex flex-col min-h-0 pt-2"
          >
            <TabsList className="grid grid-cols-3 h-9 w-full shrink-0 bg-muted/80 p-1">
              {(
                [
                  {
                    id: "ssc_physics",
                    label: "SSC Physics",
                    bangla: "পদার্থবিজ্ঞান",
                    icon: Atom,
                  },
                  {
                    id: "ssc_hmath",
                    label: "SSC Higher Math",
                    bangla: "উচ্চতর গণিত",
                    icon: Calculator,
                  },
                  {
                    id: "ssc_math",
                    label: "SSC General Math",
                    bangla: "সাধারণ গণিত",
                    icon: BookOpen,
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.bangla}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent
              value={subject}
              className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
            >
              <div className="flex-1 overflow-auto rounded-lg bg-neutral-950 p-3 sm:p-4 font-mono text-[11px] sm:text-xs text-neutral-200 border border-neutral-800 leading-relaxed no-scrollbar select-text">
                <pre className="whitespace-pre-wrap">
                  {GENERATION_PROMPTS[subject].prompt}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto rounded-lg bg-neutral-950 p-3 sm:p-4 font-mono text-[11px] sm:text-xs text-neutral-200 border border-neutral-800 leading-relaxed no-scrollbar select-text">
              <pre className="whitespace-pre-wrap">
                {ORIGINAL_XELATEX_FORMATTER_PROMPT}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-2">
            <span>
              Target:{" "}
              <strong className="text-foreground font-semibold">
                {activeLabel}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 bg-primary text-primary-foreground font-medium"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied
                ? "Copied!"
                : `Copy ${
                    mode === "format"
                      ? "XeLaTeX Formatter Prompt"
                      : `${GENERATION_PROMPTS[subject].label} Prompt`
                  }`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
