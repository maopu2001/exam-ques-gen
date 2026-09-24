"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { compileExamToLatexBundle } from "@/lib/generator";
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
  Upload,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "exam_studio_draft_json";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [selectedPreset, setSelectedPreset] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved.trim()) {
          const parsed = JSON.parse(saved);
          if (parsed.preset) return parsed.preset;
        }
      } catch {}
    }
    return "ssc_math";
  });
  const [includeSolutions, setIncludeSolutions] = useState(true);

  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<CompilerLogEntry[]>([]);
  const [latestLog, setLatestLog] = useState<CompilerLogEntry | null>(null);
  const [compilationResult, setCompilationResult] =
    useState<CompilationResult | null>(null);

  // Pure derived state calculated during render (Zero cascading renders)
  const { latexBundle, jsonError } = useMemo(() => {
    if (!jsonText.trim()) {
      return { latexBundle: null, jsonError: null };
    }
    try {
      const parsed = JSON.parse(jsonText);
      const res = compileExamToLatexBundle(parsed);
      if (res.success) {
        return { latexBundle: res.bundle, jsonError: null };
      }
      return { latexBundle: null, jsonError: res.errors.join("; ") };
    } catch (err: any) {
      return {
        latexBundle: null,
        jsonError: err?.message || "Invalid JSON syntax",
      };
    }
  }, [jsonText]);

  // Persist draft indefinitely across browser sessions (debounced 500ms for large JSON performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, jsonText);
      } catch {}
    }, 500);

    return () => clearTimeout(timer);
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
      } catch {}
    }

    restoreCachedPdf();
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setJsonText(content);
          try {
            const parsed = JSON.parse(content);
            if (parsed.preset) setSelectedPreset(parsed.preset);
            toast.success(`Imported "${file.name}" cleanly!`);
          } catch {
            toast.warning(
              `Imported "${file.name}", but JSON syntax has errors.`,
            );
          }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.onerror = () => {
        toast.error("Failed to read JSON file.");
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsText(file);
    },
    [],
  );

  const handlePasteClipboard = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        toast.error("Clipboard API not supported in this browser.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.error("Clipboard is empty.");
        return;
      }
      setJsonText(text);
      try {
        const parsed = JSON.parse(text);
        if (parsed.preset) setSelectedPreset(parsed.preset);
        toast.success("Pasted JSON from clipboard!");
      } catch {
        toast.warning("Pasted text, but invalid JSON syntax.");
      }
    } catch {
      toast.error("Clipboard access denied. Please grant permission.");
    }
  }, []);

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
          setLogs((prev) => {
            if (prev.some((l) => l.message === log.message)) return prev;
            return [...prev, log];
          });
        },
      );

      setCompilationResult(result);
      if (result.success) {
        toast.success("Master Exam PDF compiled successfully!");
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
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCompile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleFormatJson();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCompile, handleFormatJson]);

  const handlePreloadComplete = useCallback(() => {}, []);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Hidden File Input for Clean Mobile & Desktop JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        tabIndex={-1}
        onChange={handleFileUpload}
      />

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
                className="hidden sm:inline-flex text-[10px] py-0 px-1.5 h-4 font-mono font-normal text-muted-foreground border-border"
              >
                v2.5
              </Badge>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <span>Bengali XeLaTeX Engine</span>
              <span className="text-[9px] px-1 rounded bg-primary/10 text-primary font-mono font-semibold">
                Client WASM
              </span>
            </p>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Preset Selector */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1">
            <span className="text-xs text-muted-foreground font-medium">
              Preset:
            </span>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-8 w-44 text-xs font-medium border-border bg-card">
                <SelectValue placeholder="Select Exam Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ssc_math">
                  SSC General Math (গণিত)
                </SelectItem>
                <SelectItem value="ssc_hmath">
                  SSC Higher Math (উচ্চতর গণিত)
                </SelectItem>
                <SelectItem value="ssc_physics">
                  SSC Physics (পদার্থবিজ্ঞান)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Solutions Toggle */}
          <div className="hidden xl:flex items-center gap-2 mr-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60">
            <label
              htmlFor="solutions-toggle-desktop"
              className="text-xs text-muted-foreground font-medium cursor-pointer select-none"
            >
              MCQ Solutions
            </label>
            <input
              id="solutions-toggle-desktop"
              type="checkbox"
              checked={includeSolutions}
              onChange={(e) => setIncludeSolutions(e.target.checked)}
              className="size-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          {/* AI Prompt Assistant Button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex h-8 text-xs gap-1.5 font-medium border-border bg-card shadow-2xs hover:bg-accent/10 hover:text-foreground"
            onClick={() => setAiPromptOpen(true)}
          >
            <Sparkles className="size-3.5 text-yellow-600 dark:text-yellow-400 fill-yellow-500/20" />
            <span>AI Prompt Assistant</span>
          </Button>

          {/* Reset to Sample Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1.5"
            onClick={handleLoadSample}
            title="Load sample 5-section exam JSON"
          >
            <RotateCcw className="size-3.5" />
            <span>Sample</span>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Primary Action Button: Compile PDF */}
          <Button
            size="sm"
            disabled={isCompiling}
            className="h-8 w-8 sm:w-auto text-xs gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            onClick={handleCompile}
          >
            {isCompiling ? (
              <>
                <span className="size-2 rounded-full bg-primary-foreground animate-ping" />
                <span className="hidden sm:inline">Compiling...</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span className="hidden sm:inline">Compile PDF</span>
              </>
            )}
          </Button>

          {/* Mobile Options Sheet Trigger (< 1024px) */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 lg:hidden"
            onClick={() => setMobileSettingsOpen(true)}
            title="Open Exam Options & Settings"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </header>

      {/* 2. PROGRESS BANNER WHEN COMPILING */}
      {isCompiling && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 text-foreground font-medium truncate">
            <span className="size-2 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="text-primary font-bold">{progressPercent}%</span>
            <span className="truncate text-muted-foreground">
              {latestLog?.message || "Executing LaTeX compilation passes..."}
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Stage: {latestLog?.stage || "processing"}
          </span>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-2 sm:p-3 overflow-hidden bg-background flex flex-col min-h-0">
        {/* DESKTOP RESIZABLE SPLIT PANELS (>= 768px) */}
        <div className="hidden md:block flex-1 h-full min-h-0">
          <PanelGroup
            direction="horizontal"
            className="h-full rounded-lg border border-border overflow-hidden shadow-xs"
          >
            {/* Left Panel: JSON Editor & LaTeX Tabs */}
            <Panel
              defaultSize={50}
              minSize={25}
              className="flex flex-col bg-card overflow-hidden"
            >
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
                    className="h-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border bg-muted/70 hover:bg-muted font-medium text-foreground/90 hover:text-foreground cursor-pointer"
                    onClick={handleFormatJson}
                    title="Format and prettify JSON"
                  >
                    <AlignLeft className="size-3.5 text-primary" />
                    <span>Format</span>
                  </Button>

                  {/* Upload JSON Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border bg-muted/70 hover:bg-muted font-medium text-foreground/90 hover:text-foreground cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload & import a .json file directly"
                  >
                    <Upload className="size-3.5 text-primary" />
                    <span>Upload</span>
                  </Button>

                  {/* Paste from Clipboard Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border bg-muted/70 hover:bg-muted font-medium text-foreground/90 hover:text-foreground cursor-pointer"
                    onClick={handlePasteClipboard}
                    title="Paste JSON from system clipboard"
                  >
                    <ClipboardPaste className="size-3.5 text-primary" />
                  </Button>

                  {/* Clear JSON Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border bg-muted/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-medium text-destructive sm:text-foreground/80 transition-colors cursor-pointer"
                    onClick={handleClearJson}
                    title="Clear editor to blank exam template"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {jsonError ? (
                    <Badge
                      variant="destructive"
                      className="text-[10px] py-0 h-5 font-semibold"
                    >
                      Syntax Error
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 font-semibold text-accent border-accent/40 bg-accent/10"
                    >
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
            <Panel
              defaultSize={50}
              minSize={25}
              className="flex flex-col bg-card overflow-hidden"
            >
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
                <div className="flex items-center gap-1">
                  {jsonError ? (
                    <Badge
                      variant="destructive"
                      className="text-[10px] py-0 h-5"
                    >
                      Error
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 text-accent border-accent/40 bg-accent/10"
                    >
                      Valid
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-primary gap-1"
                    onClick={handlePasteClipboard}
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10"
                    onClick={handleClearJson}
                  >
                    <Trash2 className="size-3" />
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

      {/* 4. MOBILE BOTTOM TAB NAVIGATION (< 768px) */}
      <div className="md:hidden h-14 border-t border-border bg-card flex items-center justify-around px-3 gap-2 shrink-0 z-20">
        <Button
          variant={mobileTab === "json" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-medium relative"
          onClick={() => setMobileTab("json")}
        >
          <Code2 className="size-4" />
          <span>JSON</span>
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
      <AiPromptDialog open={aiPromptOpen} onOpenChange={setAiPromptOpen} />

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
        onUploadJson={() => fileInputRef.current?.click()}
        onPasteClipboard={handlePasteClipboard}
      />

      {/* 7. APP INITIAL SPLASH SCREEN WITH 30-DAY PRELOADER */}
      <AppSplashScreen onPreloadComplete={handlePreloadComplete} />
    </div>
  );
}
