"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { GeneratedExamBundle } from "@/lib/generator";

interface LatexPreviewPanelProps {
  bundle: GeneratedExamBundle | null;
}

export function LatexPreviewPanel({ bundle }: LatexPreviewPanelProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Generate or validate JSON to preview modular LaTeX files.
      </div>
    );
  }

  const files = [
    { id: "config", label: "config.tex", content: bundle.configTex },
    { id: "cq", label: "cq_questions.tex", content: bundle.cqTex },
    { id: "sq", label: "sq_questions.tex", content: bundle.sqTex },
    { id: "mcq", label: "mcq_questions.tex", content: bundle.mcqTex },
    { id: "sol", label: "mcq_solutions.tex", content: bundle.solTex },
  ];

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedTab(id);
    toast.success("LaTeX source copied!");
    setTimeout(() => setCopiedTab(null), 1500);
  };

  return (
    <Tabs defaultValue="config" className="flex flex-col h-full w-full">
      <div className="px-3 py-1.5 border-b bg-card/60 flex items-center justify-between shrink-0">
        <TabsList className="h-7 bg-muted/60 p-0.5">
          {files.map((f) => (
            <TabsTrigger key={f.id} value={f.id} className="text-xs h-6 px-2">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {files.map((f) => (
        <TabsContent key={f.id} value={f.id} className="flex-1 p-0 m-0 overflow-hidden relative">
          <div className="absolute right-3 top-3 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1 bg-neutral-900/80 text-neutral-200 hover:bg-neutral-800"
              onClick={() => handleCopy(f.id, f.content)}
            >
              {copiedTab === f.id ? (
                <Check className="size-3 text-accent" />
              ) : (
                <Copy className="size-3" />
              )}
              Copy .tex
            </Button>
          </div>
          <div className="h-full w-full p-4 font-mono text-xs overflow-auto bg-neutral-950 text-neutral-200">
            <pre className="whitespace-pre">{f.content}</pre>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
