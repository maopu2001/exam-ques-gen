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
| \\implies | "\\\\implies" |
| \\circ | "\\\\circ" |
| \\angle | "\\\\angle" |

---

### SPECIFIC QUESTION TYPE RULES:
1. Multi-Statement MCQs: in "stems", provide clean statements without i., ii., iii. prefixes.
2. Context-Based MCQs: place "context" object only on first question of the group. "title" should state question range (e.g., "নিচের তথ্যের আলোকে ১৬ ও ১৭ নম্বর প্রশ্নের উত্তর দাও:").
3. MCQ Options: clean array of 4 options without ক), খ) prefixes.
4. MCQ Answers: single Bangla letter "ক", "খ", "গ", or "ঘ".
5. CQ Subquestions: array of 3 or 4 strings. Generator numbers and assigns marks automatically.`;

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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <DialogTitle>AI Assistant Prompt for JSON Conversion</DialogTitle>
          </div>
          <DialogDescription>
            Copy and paste this system prompt into ChatGPT, Claude, or Gemini to turn any raw exam text into valid JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-md bg-neutral-950 p-4 font-mono text-xs text-neutral-200 border border-neutral-800">
          <pre className="whitespace-pre-wrap">{AI_PROMPT_TEXT}</pre>
        </div>

        <div className="flex justify-end gap-2 pt-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : "Copy Prompt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
