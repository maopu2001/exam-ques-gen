"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AiPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AI_PROMPT_TEXT = `You are an expert LaTeX exam parser and JSON formatting engine. Your task is to extract, convert, and format exam questions into a single valid, well-structured JSON document for an automated XeLaTeX exam compilation pipeline.

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

export function AiPromptDialog({ open, onOpenChange }: AiPromptDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_TEXT);
      setCopied(true);
      toast.success("AI Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5 text-yellow-600" />
            <DialogTitle className="text-base font-bold text-foreground">
              AI Question-to-JSON System Prompt
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Copy and paste this prompt into ChatGPT, Claude, or Gemini along
            with any exam question text or image transcript.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-lg bg-neutral-950 p-3 sm:p-4 font-mono text-[11px] sm:text-xs text-neutral-200 border border-neutral-800 leading-relaxed">
          <pre className="whitespace-pre-wrap">{AI_PROMPT_TEXT}</pre>
        </div>

        <div className="flex justify-end gap-2 pt-2 shrink-0">
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
            className="gap-1.5 bg-primary text-primary-foreground"
          >
            {copied ? (
              <Check className="size-3.5 text-accent" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied!" : "Copy Full Prompt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
