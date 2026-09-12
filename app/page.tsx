"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonEditorPanel } from "@/components/json-editor-panel";
import { VisualFormBuilder } from "@/components/visual-form-builder";
import { LatexPreviewPanel } from "@/components/latex-preview-panel";
import { PdfViewerPanel } from "@/components/pdf-viewer-panel";
import { CompilerLogsDrawer } from "@/components/compiler-logs-drawer";
import { AiPromptDialog } from "@/components/ai-prompt-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { SAMPLE_EXAM_DATA } from "@/lib/sample-data";
import { compileExamToLatexBundle, type GeneratedExamBundle } from "@/lib/generator";
import { compilerEngine } from "@/lib/compiler/engine";
import type { CompilationResult, CompilerLogEntry } from "@/lib/compiler/types";
import {
  FileText,
  Sparkles,
  Play,
  RotateCcw,
  AlignLeft,
  Code2,
  Eye,
  Columns2,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(SAMPLE_EXAM_DATA, null, 2)
  );
  const [activeTab, setActiveTab] = useState<"editor" | "form" | "latex">("editor");
  const [mobileTab, setMobileTab] = useState<"input" | "pdf">("input");
  const [selectedPreset, setSelectedPreset] = useState("ssc_math");

  // Panel Visibility Toggles for Desktop
  const [showEditor, setShowEditor] = useState(true);
  const [showPdf, setShowPdf] = useState(true);
  const [includeSolutions, setIncludeSolutions] = useState(true);

  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<CompilerLogEntry[]>([]);
  const [compilationResult, setCompilationResult] =
    useState<CompilationResult | null>(null);

  const [latexBundle, setLatexBundle] = useState<GeneratedExamBundle | null>(
    null
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Real-time validation & LaTeX preview update
  useEffect(() => {
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

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      toast.success("JSON formatted cleanly!");
    } catch {
      toast.error("Cannot format invalid JSON.");
    }
  };

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

  const toggleEditor = () => {
    if (showEditor && !showPdf) {
      setShowPdf(true);
      setShowEditor(false);
      return;
    }
    setShowEditor(!showEditor);
  };

  const togglePdf = () => {
    if (showPdf && !showEditor) {
      setShowEditor(true);
      setShowPdf(false);
      return;
    }
    setShowPdf(!showPdf);
  };

  const setSplitView = () => {
    setShowEditor(true);
    setShowPdf(true);
  };

  const handleCompile = async () => {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      toast.error("Fix JSON errors before compiling.");
      return;
    }

    setIsCompiling(true);
    setProgressPercent(10);
    setLogs([]);

    // Automatically make sure PDF panel is visible when compiling
    if (!showPdf) {
      setShowPdf(true);
    }
    setMobileTab("pdf");

    try {
      const result = await compilerEngine.compile(
        parsedJson,
        { includeSolutions },
        (stage, percent, log) => {
          setProgressPercent(percent);
          setLogs((prev) => [...prev, log]);
        }
      );

      setCompilationResult(result);
      if (result.success) {
        toast.success("Master Exam PDF compiled successfully!");
      } else {
        toast.error(result.error || "Compilation failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Unexpected compilation error.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Top Navbar */}
      <header className="h-14 border-b px-3 sm:px-4 flex items-center justify-between bg-card/70 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm shrink-0">
            <FileText className="size-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-semibold leading-tight flex items-center gap-1.5 sm:gap-2">
              Bangla Exam Studio
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-normal py-0 h-4 border-emerald-400 text-emerald-600 dark:text-emerald-400">
                XeLaTeX Engine
              </Badge>
            </h1>
            <p className="hidden sm:block text-[11px] text-muted-foreground">
              JSON to NCTB Exam Paper PDF with 2x1 booklet imposition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 hidden md:inline-flex"
            onClick={() => setAiPromptOpen(true)}
          >
            <Sparkles className="size-3.5 text-amber-500" />
            AI Prompt
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 hidden sm:inline-flex"
            onClick={handleLoadSample}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 shadow-sm font-medium px-2.5 sm:px-3"
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <RotateCcw className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            <span className="hidden sm:inline">{isCompiling ? "Compiling..." : "Compile Exam PDF"}</span>
            <span className="sm:hidden">{isCompiling ? "Compiling" : "Compile"}</span>
          </Button>
        </div>
      </header>

      {/* Control / Options Bar */}
      <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b bg-muted/30 flex items-center justify-between text-xs gap-2 sm:gap-4 shrink-0 overflow-x-auto">
        {/* Left: Preset Selector & View Toggles */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium hidden sm:inline">Preset:</span>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-background border rounded px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ssc_math">General Math (গণিত)</option>
              <option value="ssc_hmath">Higher Math (উচ্চতর গণিত)</option>
              <option value="ssc_physics">Physics (পদার্থবিজ্ঞান)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border mx-0.5 sm:mx-1" />

          {/* Solution Attachment Option */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSolutions}
              onChange={(e) => setIncludeSolutions(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary size-3.5"
            />
            <span className="text-muted-foreground font-medium text-[11px] sm:text-xs">Solutions</span>
          </label>

          {/* Desktop Toggle Panels Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-background border rounded-md p-0.5 ml-1">
            <Button
              variant={showEditor ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={toggleEditor}
              title="Toggle JSON Editor Panel"
            >
              {showEditor ? <PanelLeft className="size-3 text-primary" /> : <PanelLeftClose className="size-3" />}
              Editor
            </Button>

            <Button
              variant={showEditor && showPdf ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={setSplitView}
              title="50/50 Split Screen View"
            >
              <Columns2 className="size-3" />
              Split
            </Button>

            <Button
              variant={showPdf ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={togglePdf}
              title="Toggle PDF Viewer Panel"
            >
              {showPdf ? <PanelRight className="size-3 text-primary" /> : <PanelRightClose className="size-3" />}
              PDF Viewer
            </Button>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 md:hidden"
            onClick={() => setAiPromptOpen(true)}
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>AI Prompt</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace (Responsive Desktop Grid / Mobile Tab Switching) */}
      <main className="flex-1 p-2 sm:p-3 overflow-hidden bg-muted/15 flex flex-col min-h-0">
        <div
          className={`flex-1 grid gap-2 sm:gap-3 overflow-hidden min-h-0 ${
            showEditor && showPdf
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {/* Left Side: Editor / Visual Form / LaTeX Tabs */}
          {(showEditor || (typeof window !== "undefined" && window.innerWidth < 1024 && mobileTab === "input")) && (
            <Card className={`flex flex-col h-full overflow-hidden border shadow-sm ${mobileTab === "pdf" ? "hidden lg:flex" : "flex"}`}>
              <CardHeader className="p-2 sm:p-2.5 border-b bg-card/60 flex flex-row items-center justify-between shrink-0 space-y-0">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as any)}
                    className="w-auto"
                  >
                    <TabsList className="h-8 p-1 bg-muted/80 rounded-lg border border-border/40 gap-1">
                      <TabsTrigger
                        value="editor"
                        className="text-xs h-6 px-2.5 gap-1.5 rounded-md font-medium transition-all"
                      >
                        <Code2 className="size-3.5" />
                        JSON
                      </TabsTrigger>
                      <TabsTrigger
                        value="form"
                        className="text-xs h-6 px-2.5 gap-1.5 rounded-md font-medium transition-all"
                      >
                        <SlidersHorizontal className="size-3.5" />
                        Visual Form
                      </TabsTrigger>
                      <TabsTrigger
                        value="latex"
                        className="text-xs h-6 px-2.5 gap-1.5 rounded-md font-medium transition-all"
                      >
                        <FileText className="size-3.5" />
                        LaTeX
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Format JSON Button beside LaTeX Tab */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg border-border/60 bg-muted/30 hover:bg-muted font-medium text-muted-foreground hover:text-foreground"
                    onClick={handleFormatJson}
                    title="Format and prettify JSON"
                  >
                    <AlignLeft className="size-3.5 text-primary" />
                    <span>Format JSON</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {jsonError ? (
                    <Badge variant="destructive" className="text-[10px] py-0 h-5">
                      Error
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 h-5 text-emerald-600 border-emerald-300">
                      Valid
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hidden lg:inline-flex"
                    onClick={() => setShowEditor(false)}
                    title="Hide Editor"
                  >
                    <PanelLeftClose className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden relative min-h-0">
                {activeTab === "editor" && (
                  <JsonEditorPanel
                    value={jsonText}
                    onChange={setJsonText}
                    error={jsonError}
                  />
                )}
                {activeTab === "form" && (
                  <VisualFormBuilder
                    jsonText={jsonText}
                    onChange={setJsonText}
                  />
                )}
                {activeTab === "latex" && (
                  <LatexPreviewPanel bundle={latexBundle} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Right Side: PDF Viewer Panel */}
          {(showPdf || (typeof window !== "undefined" && window.innerWidth < 1024 && mobileTab === "pdf")) && (
            <Card className={`flex flex-col h-full overflow-hidden border shadow-sm ${mobileTab === "input" ? "hidden lg:flex" : "flex"}`}>
              <CardHeader className="p-2 sm:p-2.5 border-b bg-card/60 flex flex-row items-center justify-between shrink-0 space-y-0">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-primary" />
                  <CardTitle className="text-xs font-semibold">
                    Compiled Output Inspector
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hidden lg:inline-flex"
                  onClick={() => setShowPdf(false)}
                  title="Hide PDF Viewer"
                >
                  <PanelRightClose className="size-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden relative min-h-0">
                <PdfViewerPanel
                  result={compilationResult}
                  isCompiling={isCompiling}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (< lg screens) */}
      <div className="lg:hidden h-12 border-t bg-card/90 backdrop-blur flex items-center justify-around px-2 shrink-0 z-20">
        <Button
          variant={mobileTab === "input" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-medium"
          onClick={() => setMobileTab("input")}
        >
          <Code2 className="size-4" />
          Editor / Form
        </Button>

        <Button
          variant={mobileTab === "pdf" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs font-medium"
          onClick={() => setMobileTab("pdf")}
        >
          <Eye className="size-4" />
          PDF Preview
        </Button>
      </div>

      {/* Bottom Live Compiler Logs Drawer */}
      <CompilerLogsDrawer
        logs={logs}
        isCompiling={isCompiling}
        progressPercent={progressPercent}
      />

      {/* AI Prompt Modal */}
      <AiPromptDialog
        open={aiPromptOpen}
        onOpenChange={setAiPromptOpen}
      />
    </div>
  );
}
