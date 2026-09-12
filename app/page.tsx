"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { JsonEditorPanel } from "@/components/json-editor-panel";
import { LatexPreviewPanel } from "@/components/latex-preview-panel";
import { PdfViewerPanel } from "@/components/pdf-viewer-panel";
import { CompilerLogsDrawer } from "@/components/compiler-logs-drawer";
import { AiPromptDialog } from "@/components/ai-prompt-dialog";
import { MobileSettingsSheet } from "@/components/mobile-settings-sheet";
import { AppSplashScreen } from "@/components/app-splash-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import { SAMPLE_EXAM_DATA } from "@/lib/sample-data";
import {
  compileExamToLatexBundle,
  type GeneratedExamBundle,
} from "@/lib/generator";
import { compilerEngine } from "@/lib/compiler/engine";
import type { CompilationResult, CompilerLogEntry } from "@/lib/compiler/types";
import {
  saveCompiledPdfToCache,
  getCachedCompiledPdf,
} from "@/lib/compiler/pdf-cache";
import {
  FileText,
  Sparkles,
  Play,
  RotateCcw,
  AlignLeft,
  Trash2,
  Code2,
  Eye,
  SlidersHorizontal,
  GripVertical,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "exam_studio_draft_json";

export default function HomePage() {
  const [jsonText, setJsonText] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved.trim()) {
          return saved;
        }
      } catch {}
    }
    return JSON.stringify(SAMPLE_EXAM_DATA, null, 2);
  });
  const [activeTab, setActiveTab] = useState<"editor" | "latex">("editor");
  const [mobileTab, setMobileTab] = useState<"json" | "latex" | "pdf">("json");
  const [selectedPreset, setSelectedPreset] = useState("ssc_math");
  const [includeSolutions, setIncludeSolutions] = useState(true);

  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<CompilerLogEntry[]>([]);
  const [latestLog, setLatestLog] = useState<CompilerLogEntry | null>(null);
  const [compilationResult, setCompilationResult] =
    useState<CompilationResult | null>(null);

  const [latexBundle, setLatexBundle] = useState<GeneratedExamBundle | null>(
    null,
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  // Restore draft from localStorage on mount (hydration safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        setJsonText(saved);
        try {
          const parsed = JSON.parse(saved);
          if (parsed.preset) {
            setSelectedPreset(parsed.preset);
          }
        } catch {}
      }
    } catch {}

    // Signal app readiness for splash screen fade out
    setIsAppReady(true);
  }, []);

  // Persist draft indefinitely across browser sessions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, jsonText);
    } catch {}
  }, [jsonText]);

  // Restore previously compiled PDF from IndexedDB (1-hour cache)
  useEffect(() => {
    async function restoreCachedPdf() {
      try {
        const cached = await getCachedCompiledPdf();
        if (cached && cached.masterPdfBytes) {
          const blob = new Blob([cached.masterPdfBytes as any], {
            type: "application/pdf",
          });
          const masterPdfUrl = URL.createObjectURL(blob);
          setCompilationResult({
            success: true,
            masterPdfUrl,
            masterPdfBytes: cached.masterPdfBytes,
            cqSqPdfBytes: cached.cqSqPdfBytes,
            mcqPdfBytes: cached.mcqPdfBytes,
            solPdfBytes: cached.solPdfBytes,
            pageCount: cached.pageCount,
            logs: [],
            durationMs: cached.durationMs,
          });
          toast.info("Restored compiled PDF from 1-hour cache.");
        }
      } catch (err) {}
    }

    restoreCachedPdf();
  }, []);

  // Real-time validation & LaTeX preview update
  useEffect(() => {
    if (!jsonText.trim()) {
      setLatexBundle(null);
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      const res = compileExamToLatexBundle(parsed);

      if (res.success) {
        setLatexBundle(res.bundle);
        setJsonError(null);
      } else {
        setJsonError(res.errors.join("; "));
      }
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax");
    }
  }, [jsonText]);

  const handleFormatJson = useCallback(() => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      toast.success("JSON formatted cleanly!");
    } catch {
      toast.error("Cannot format invalid JSON.");
    }
  }, [jsonText]);

  const handleClearJson = useCallback(() => {
    setJsonText("");
    toast.info("Editor cleared.");
  }, []);

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_EXAM_DATA, null, 2));
    toast.success("Sample 5-section exam loaded!");
  };

  const handlePresetChange = (newPreset: string) => {
    setSelectedPreset(newPreset);
    try {
      const parsed = JSON.parse(jsonText);
      parsed.preset = newPreset;
      setJsonText(JSON.stringify(parsed, null, 2));
      toast.info(`Switched preset to: ${newPreset}`);
    } catch {}
  };

  const handleCompile = useCallback(async () => {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      toast.error("Fix JSON syntax errors before compiling.");
      return;
    }

    setIsCompiling(true);
    setProgressPercent(10);
    setLogs([]);
    setLatestLog(null);
    setMobileTab("pdf");

    try {
      const result = await compilerEngine.compile(
        parsedJson,
        { includeSolutions },
        (stage, percent, log) => {
          setProgressPercent(percent);
          setLatestLog(log);
          // Only add to log history if it's a milestone log (type !== 'info' or explicit milestone)
          setLogs((prev) => {
            if (prev.some((l) => l.message === log.message)) return prev;
            return [...prev, log];
          });
        }
      );

      setCompilationResult(result);
      if (result.success) {
        toast.success("Master Exam PDF compiled successfully!");
        // Cache to IndexedDB (valid for 1 hour across reloads)
        if (result.masterPdfBytes) {
          saveCompiledPdfToCache({
            masterPdfBytes: result.masterPdfBytes,
            cqSqPdfBytes: result.cqSqPdfBytes,
            mcqPdfBytes: result.mcqPdfBytes,
            solPdfBytes: result.solPdfBytes,
            pageCount: result.pageCount || 5,
            durationMs: result.durationMs,
          }).catch(() => {});
        }
      } else {
        toast.error(result.error || "Compilation failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Unexpected compilation error.");
    } finally {
      setIsCompiling(false);
    }
  }, [jsonText, includeSolutions]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter -> Compile PDF
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCompile();
      }
      // Cmd/Ctrl + S -> Format JSON
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleFormatJson();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCompile, handleFormatJson]);

  const handlePreloadComplete = useCallback(() => {
    setIsAppReady(true);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* 1. TOP NAVBAR */}
      <header className="h-14 border-b border-border px-3 sm:px-4 flex items-center justify-between bg-card shrink-0 z-20 shadow-xs">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="size-8 rounded-lg overflow-hidden shadow-sm shrink-0 flex items-center justify-center bg-card border border-border">
            <Image
              src="/logo.png"
              alt="Exam Studio Logo"
              width={32}
              height={32}
              className="size-8 object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight leading-tight flex items-center gap-1.5 sm:gap-2">
              Exam Studio
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] font-semibold py-0 h-4 border-accent/50 text-accent bg-accent/10"
              >
                XeLaTeX Engine
              </Badge>
            </h1>
            <p className="hidden sm:block text-[11px] text-muted-foreground font-medium">
              JSON to NCTB Exam Paper PDF with 2x1 booklet imposition
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {/* Mobile Settings Drawer Trigger */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5 md:hidden border-border"
            onClick={() => setMobileSettingsOpen(true)}
            aria-label="Open Settings"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Options</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 hidden md:inline-flex border-border/80"
            onClick={() => setAiPromptOpen(true)}
          >
            <Sparkles className="size-3.5 text-yellow-600" />
            AI Prompt
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 hidden sm:inline-flex border-border/80"
            onClick={handleLoadSample}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>

          {/* Compile Button */}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 shadow-sm font-semibold px-3 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <RotateCcw className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            <span className="hidden sm:inline">
              {isCompiling ? "Compiling..." : "Compile Exam PDF"}
            </span>
            <span className="sm:hidden">
              {isCompiling ? "Compiling" : "Compile"}
            </span>
          </Button>
        </div>
      </header>

      {/* 2. DESKTOP OPTIONS TOOLBAR (Hidden on mobile to save screen height) */}
      <div className="hidden md:flex px-4 py-1.5 border-b border-border bg-muted/40 items-center justify-between text-xs gap-4 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-semibold text-xs">
              Preset:
            </span>
            <Select
              value={selectedPreset}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger className="h-7 w-[185px] text-xs bg-card border-border shadow-2xs font-medium">
                <SelectValue placeholder="Select Exam Preset" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="ssc_math">General Math (গণিত)</SelectItem>
                <SelectItem value="ssc_hmath">Higher Math (উচ্চতর গণিত)</SelectItem>
                <SelectItem value="ssc_physics">Physics (পদার্থবিজ্ঞান)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Solution Attachment Option */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSolutions}
              onChange={(e) => setIncludeSolutions(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary size-3.5 cursor-pointer"
            />
            <span className="text-foreground/90 font-medium text-xs">
              Include Solutions
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
            Ctrl+Enter
          </kbd>
          <span>Compile</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
            Ctrl+S
          </kbd>
          <span>Format</span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-2 sm:p-3 overflow-hidden bg-background flex flex-col min-h-0">
        {/* DESKTOP RESIZABLE SPLIT PANELS (>= 768px) */}
        <div className="hidden md:block flex-1 h-full min-h-0">
          <PanelGroup direction="horizontal" className="h-full rounded-lg border border-border overflow-hidden shadow-xs">
            {/* Left Panel: JSON Editor & LaTeX Tabs */}
            <Panel defaultSize={50} minSize={25} className="flex flex-col bg-card overflow-hidden">
              <div className="p-2 sm:p-2.5 border-b border-border bg-card flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as any)}
                    className="w-auto"
                  >
                    <TabsList className="h-8 p-1 bg-muted rounded-lg border border-border gap-1">
                      <TabsTrigger
                        value="editor"
                        className="text-xs h-6 px-2.5 gap-1.5 rounded-md font-medium transition-all"
                      >
                        <Code2 className="size-3.5" />
                        JSON Editor
                      </TabsTrigger>
                      <TabsTrigger
                        value="latex"
                        className="text-xs h-6 px-2.5 gap-1.5 rounded-md font-medium transition-all"
                      >
                        <FileText className="size-3.5" />
                        LaTeX Source
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Format JSON Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border bg-muted/70 hover:bg-muted font-medium text-foreground/90 hover:text-foreground"
                    onClick={handleFormatJson}
                    title="Format and prettify JSON"
                  >
                    <AlignLeft className="size-3.5 text-primary" />
                    <span>Format JSON</span>
                  </Button>

                  {/* Clear JSON Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border bg-muted/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-medium text-foreground/80 transition-colors"
                    onClick={handleClearJson}
                    title="Clear editor to blank exam template"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Clear</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {jsonError ? (
                    <Badge variant="destructive" className="text-[10px] py-0 h-5 font-semibold">
                      Syntax Error
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 h-5 font-semibold text-accent border-accent/40 bg-accent/10">
                      Valid Schema
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 p-0 overflow-hidden relative min-h-0 bg-card">
                {activeTab === "editor" ? (
                  <JsonEditorPanel
                    value={jsonText}
                    onChange={setJsonText}
                    error={jsonError}
                  />
                ) : (
                  <LatexPreviewPanel bundle={latexBundle} />
                )}
              </div>
            </Panel>

            {/* Resizable Divider Handle */}
            <PanelResizeHandle className="w-2 bg-muted hover:bg-primary/20 active:bg-primary/40 transition-colors flex items-center justify-center cursor-col-resize group">
              <GripVertical className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </PanelResizeHandle>

            {/* Right Panel: PDF Viewer */}
            <Panel defaultSize={50} minSize={25} className="flex flex-col bg-card overflow-hidden">
              <PdfViewerPanel
                result={compilationResult}
                isCompiling={isCompiling}
                progressPercent={progressPercent}
                latestLog={latestLog}
              />
            </Panel>
          </PanelGroup>
        </div>

        {/* MOBILE FULL-SCREEN SWITCHER (< 768px) */}
        <div className="md:hidden flex-1 flex flex-col h-full overflow-hidden border border-border rounded-lg bg-card min-h-0">
          {mobileTab === "json" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
              <div className="px-3 py-2 border-b border-border bg-card flex items-center justify-between shrink-0">
                <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Code2 className="size-3.5 text-primary" />
                  JSON Editor
                </span>
                <div className="flex items-center gap-1.5">
                  {jsonError ? (
                    <Badge variant="destructive" className="text-[10px] py-0 h-5">
                      Error
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 h-5 text-accent border-accent/40 bg-accent/10">
                      Valid
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-primary"
                    onClick={handleFormatJson}
                  >
                    Format
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10"
                    onClick={handleClearJson}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <JsonEditorPanel
                  value={jsonText}
                  onChange={setJsonText}
                  error={jsonError}
                />
              </div>
            </div>
          )}

          {mobileTab === "latex" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
              <div className="px-3 py-2 border-b border-border bg-card flex items-center justify-between shrink-0">
                <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="size-3.5 text-primary" />
                  Generated LaTeX Streams
                </span>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <LatexPreviewPanel bundle={latexBundle} />
              </div>
            </div>
          )}

          {mobileTab === "pdf" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
              <PdfViewerPanel
                result={compilationResult}
                isCompiling={isCompiling}
                progressPercent={progressPercent}
                latestLog={latestLog}
              />
            </div>
          )}
        </div>
      </main>

      {/* 4. MOBILE BOTTOM DOCK (< 768px) */}
      <div className="md:hidden h-13 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-around px-2 shrink-0 z-20 shadow-xs">
        <Button
          variant={mobileTab === "json" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-medium relative"
          onClick={() => setMobileTab("json")}
        >
          <Code2 className="size-4 text-primary" />
          <span>Editor</span>
          {jsonError && (
            <span className="size-2 rounded-full bg-destructive absolute right-2 top-2" />
          )}
        </Button>

        <Button
          variant={mobileTab === "latex" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-medium"
          onClick={() => setMobileTab("latex")}
        >
          <FileText className="size-4" />
          <span>LaTeX</span>
        </Button>

        <Button
          variant={mobileTab === "pdf" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-medium relative"
          onClick={() => setMobileTab("pdf")}
        >
          <Eye className="size-4 text-primary" />
          <span>PDF</span>
          {compilationResult?.success && (
            <span className="size-2 rounded-full bg-accent absolute right-2 top-2 animate-pulse" />
          )}
        </Button>
      </div>

      {/* 5. BOTTOM COMPILER LOGS DRAWER */}
      <CompilerLogsDrawer
        logs={logs}
        isCompiling={isCompiling}
        progressPercent={progressPercent}
        latestLog={latestLog}
      />

      {/* 6. MODALS & SHEETS */}
      <AiPromptDialog
        open={aiPromptOpen}
        onOpenChange={setAiPromptOpen}
      />

      <MobileSettingsSheet
        open={mobileSettingsOpen}
        onOpenChange={setMobileSettingsOpen}
        selectedPreset={selectedPreset}
        onPresetChange={handlePresetChange}
        includeSolutions={includeSolutions}
        onIncludeSolutionsChange={setIncludeSolutions}
        onFormatJson={handleFormatJson}
        onClearJson={handleClearJson}
        onResetSample={handleLoadSample}
        onOpenAiPrompt={() => setAiPromptOpen(true)}
      />

      {/* 7. APP INITIAL SPLASH SCREEN WITH 30-DAY PRELOADER */}
      <AppSplashScreen onPreloadComplete={handlePreloadComplete} />
    </div>
  );
}
