"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  FileQuestion,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import type { ExamData, CqSection, CqQuestion, McqQuestion } from "@/lib/generator";

interface VisualFormBuilderProps {
  jsonText: string;
  onChange: (newJsonText: string) => void;
}

export function VisualFormBuilder({ jsonText, onChange }: VisualFormBuilderProps) {
  const [activeSubTab, setActiveSubTab] = useState<"meta" | "cq" | "sq" | "mcq">("meta");

  const parsedData = useMemo<ExamData | null>(() => {
    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }, [jsonText]);

  if (!parsedData) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-muted/20">
        <AlertCircle className="size-10 text-amber-500 mb-3" />
        <h3 className="text-sm font-semibold mb-1">Invalid JSON Syntax</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Please fix syntax errors in the JSON Editor tab to use the visual form builder.
        </p>
      </div>
    );
  }

  const updateData = (updater: (draft: ExamData) => void) => {
    try {
      const copy: ExamData = JSON.parse(JSON.stringify(parsedData));
      updater(copy);
      onChange(JSON.stringify(copy, null, 2));
    } catch (err) {
      console.error("Failed to update visual form data:", err);
    }
  };

  const meta = parsedData.metadata || {};
  const cqSections = parsedData.cqSections || [];
  const shortQuestions = parsedData.shortQuestions || [];
  const mcqQuestions = parsedData.mcqQuestions || [];

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Sub tabs */}
      <div className="px-3 py-2 border-b bg-card/60 flex items-center justify-between shrink-0">
        <Tabs
          value={activeSubTab}
          onValueChange={(v) => setActiveSubTab(v as any)}
          className="w-full"
        >
          <TabsList className="h-7 bg-muted/60 p-0.5">
            <TabsTrigger value="meta" className="text-xs h-6 px-2.5 gap-1.5">
              <Building2 className="size-3.5" />
              Metadata
            </TabsTrigger>
            <TabsTrigger value="cq" className="text-xs h-6 px-2.5 gap-1.5">
              <FileQuestion className="size-3.5" />
              CQ ({cqSections.length} Sec)
            </TabsTrigger>
            <TabsTrigger value="sq" className="text-xs h-6 px-2.5 gap-1.5">
              <HelpCircle className="size-3.5" />
              SQ ({shortQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="mcq" className="text-xs h-6 px-2.5 gap-1.5">
              <CheckCircle2 className="size-3.5" />
              MCQ ({mcqQuestions.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4 text-xs">
        {/* TAB 1: METADATA */}
        {activeSubTab === "meta" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Institute Name (প্রতিষ্ঠান)</label>
              <input
                type="text"
                value={meta.institute || ""}
                onChange={(e) =>
                  updateData((d) => {
                    d.metadata = d.metadata || {};
                    d.metadata.institute = e.target.value;
                  })
                }
                placeholder="e.g. আদর্শ উচ্চ বিদ্যালয়"
                className="w-full bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Exam Name (পরীক্ষার নাম)</label>
              <input
                type="text"
                value={meta.examName || ""}
                onChange={(e) =>
                  updateData((d) => {
                    d.metadata = d.metadata || {};
                    d.metadata.examName = e.target.value;
                  })
                }
                placeholder="e.g. বার্ষিক পরীক্ষা ২০২৫"
                className="w-full bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Subject (বিষয়)</label>
              <input
                type="text"
                value={meta.subject || ""}
                onChange={(e) =>
                  updateData((d) => {
                    d.metadata = d.metadata || {};
                    d.metadata.subject = e.target.value;
                  })
                }
                placeholder="e.g. গণিত"
                className="w-full bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Class (শ্রেণি)</label>
              <input
                type="text"
                value={meta.class || ""}
                onChange={(e) =>
                  updateData((d) => {
                    d.metadata = d.metadata || {};
                    d.metadata.class = e.target.value;
                  })
                }
                placeholder="e.g. দশম শ্রেণি"
                className="w-full bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">CQ Time & Marks</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={meta.cqTime || ""}
                  onChange={(e) =>
                    updateData((d) => {
                      d.metadata = d.metadata || {};
                      d.metadata.cqTime = e.target.value;
                    })
                  }
                  placeholder="Time: ২ ঘণ্টা ৩০ মিনিট"
                  className="w-1/2 bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
                <input
                  type="text"
                  value={meta.cqMarks || ""}
                  onChange={(e) =>
                    updateData((d) => {
                      d.metadata = d.metadata || {};
                      d.metadata.cqMarks = e.target.value;
                    })
                  }
                  placeholder="Marks: ৭০"
                  className="w-1/2 bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">MCQ Time & Marks</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={meta.mcqTime || ""}
                  onChange={(e) =>
                    updateData((d) => {
                      d.metadata = d.metadata || {};
                      d.metadata.mcqTime = e.target.value;
                    })
                  }
                  placeholder="Time: ৩০ মিনিট"
                  className="w-1/2 bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
                <input
                  type="text"
                  value={meta.mcqMarks || ""}
                  onChange={(e) =>
                    updateData((d) => {
                      d.metadata = d.metadata || {};
                      d.metadata.mcqMarks = e.target.value;
                    })
                  }
                  placeholder="Marks: ৩০"
                  className="w-1/2 bg-background border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CREATIVE QUESTIONS */}
        {activeSubTab === "cq" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Creative Question Sections</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() =>
                  updateData((d) => {
                    d.cqSections = d.cqSections || [];
                    d.cqSections.push({
                      sectionName: `বিভাগ (নতুন বিভাগ)`,
                      questions: [
                        {
                          stems: ["উদ্দীপক ১"],
                          subs: ["প্রশ্ন ক", "প্রশ্ন খ", "প্রশ্ন গ"],
                        },
                      ],
                    });
                  })
                }
              >
                <Plus className="size-3" />
                Add Section
              </Button>
            </div>

            {cqSections.map((sec, secIdx) => (
              <Card key={secIdx} className="border shadow-sm">
                <CardHeader className="p-3 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <span className="font-semibold text-xs text-muted-foreground">Section Title:</span>
                    <input
                      type="text"
                      value={sec.sectionName || sec.name || ""}
                      onChange={(e) =>
                        updateData((d) => {
                          d.cqSections[secIdx].sectionName = e.target.value;
                        })
                      }
                      className="bg-background border rounded px-2 py-1 text-xs font-semibold flex-1 max-w-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive hover:bg-destructive/10 p-1"
                    onClick={() =>
                      updateData((d) => {
                        d.cqSections.splice(secIdx, 1);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {sec.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-2.5 rounded bg-muted/20 border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">Question {qIdx + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-destructive p-1"
                          onClick={() =>
                            updateData((d) => {
                              d.cqSections[secIdx].questions.splice(qIdx, 1);
                            })
                          }
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>

                      {/* Stimulus */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Stimulus / Stems:</label>
                        {(q.stems || (q.stem ? [q.stem] : [""])).map((stem, sIdx) => (
                          <input
                            key={sIdx}
                            type="text"
                            value={stem}
                            onChange={(e) =>
                              updateData((d) => {
                                const stems = d.cqSections[secIdx].questions[qIdx].stems || [""];
                                stems[sIdx] = e.target.value;
                                d.cqSections[secIdx].questions[qIdx].stems = stems;
                              })
                            }
                            className="w-full bg-background border rounded px-2 py-1 text-xs font-mono"
                          />
                        ))}
                      </div>

                      {/* Subquestions */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Subquestions (ক, খ, গ):</label>
                        {(q.subs || q.subQuestions || []).map((sub, subIdx) => {
                          const subText = typeof sub === "string" ? sub : sub.text;
                          return (
                            <div key={subIdx} className="flex gap-2 items-center">
                              <Badge variant="outline" className="w-6 justify-center">
                                {subIdx === 0 ? "ক" : subIdx === 1 ? "খ" : subIdx === 2 ? "গ" : "ঘ"}
                              </Badge>
                              <input
                                type="text"
                                value={subText}
                                onChange={(e) =>
                                  updateData((d) => {
                                    const subs = d.cqSections[secIdx].questions[qIdx].subs || [];
                                    if (typeof subs[subIdx] === "object") {
                                      (subs[subIdx] as any).text = e.target.value;
                                    } else {
                                      subs[subIdx] = e.target.value;
                                    }
                                  })
                                }
                                className="flex-1 bg-background border rounded px-2 py-1 text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-xs border border-dashed gap-1"
                    onClick={() =>
                      updateData((d) => {
                        d.cqSections[secIdx].questions.push({
                          stems: ["নতুন উদ্দীপক"],
                          subs: ["প্রশ্ন ক", "প্রশ্ন খ", "প্রশ্ন গ"],
                        });
                      })
                    }
                  >
                    <Plus className="size-3" />
                    Add Question to Section
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 3: SHORT QUESTIONS */}
        {activeSubTab === "sq" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Short Questions (সংক্ষিপ্ত প্রশ্ন)</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() =>
                  updateData((d) => {
                    d.shortQuestions = d.shortQuestions || [];
                    d.shortQuestions.push("নতুন সংক্ষিপ্ত প্রশ্ন");
                  })
                }
              >
                <Plus className="size-3" />
                Add Short Question
              </Button>
            </div>

            <div className="space-y-2">
              {shortQuestions.map((sq, sqIdx) => {
                const text = typeof sq === "string" ? sq : sq.text;
                return (
                  <div key={sqIdx} className="flex gap-2 items-center bg-card border rounded p-2">
                    <span className="font-bold text-muted-foreground w-6 text-center">{sqIdx + 1}.</span>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) =>
                        updateData((d) => {
                          if (typeof d.shortQuestions[sqIdx] === "object") {
                            (d.shortQuestions[sqIdx] as any).text = e.target.value;
                          } else {
                            d.shortQuestions[sqIdx] = e.target.value;
                          }
                        })
                      }
                      className="flex-1 bg-background border rounded px-2.5 py-1 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive p-1"
                      onClick={() =>
                        updateData((d) => {
                          d.shortQuestions.splice(sqIdx, 1);
                        })
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MCQ QUESTIONS */}
        {activeSubTab === "mcq" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Multiple Choice Questions (MCQ)</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() =>
                  updateData((d) => {
                    d.mcqQuestions = d.mcqQuestions || [];
                    d.mcqQuestions.push({
                      q: "নতুন বহুনির্বাচনী প্রশ্ন?",
                      opts: ["অপশন ১", "অপশন ২", "অপশন ৩", "অপশন ৪"],
                      ans: "ক",
                      exp: "ব্যাখ্যা",
                    });
                  })
                }
              >
                <Plus className="size-3" />
                Add MCQ
              </Button>
            </div>

            <div className="space-y-3">
              {mcqQuestions.map((mcq, mIdx) => (
                <Card key={mIdx} className="border shadow-sm">
                  <CardHeader className="p-3 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0">
                    <span className="font-bold text-xs">MCQ {mIdx + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-destructive p-1"
                      onClick={() =>
                        updateData((d) => {
                          d.mcqQuestions.splice(mIdx, 1);
                        })
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Question Text:</label>
                      <input
                        type="text"
                        value={mcq.q || mcq.text || ""}
                        onChange={(e) =>
                          updateData((d) => {
                            d.mcqQuestions[mIdx].q = e.target.value;
                          })
                        }
                        className="w-full bg-background border rounded px-2 py-1 text-xs"
                      />
                    </div>

                    {/* 4 Choices */}
                    <div className="grid grid-cols-2 gap-2">
                      {(mcq.opts || mcq.choices || ["", "", "", ""]).map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-1.5 items-center">
                          <span className="font-bold text-[11px] text-muted-foreground w-4">
                            {optIdx === 0 ? "ক)" : optIdx === 1 ? "খ)" : optIdx === 2 ? "গ)" : "ঘ)"}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              updateData((d) => {
                                const opts = d.mcqQuestions[mIdx].opts || ["", "", "", ""];
                                opts[optIdx] = e.target.value;
                                d.mcqQuestions[mIdx].opts = opts;
                              })
                            }
                            className="flex-1 bg-background border rounded px-2 py-1 text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 items-center pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-muted-foreground">Correct Answer:</span>
                        <select
                          value={mcq.ans || mcq.answer || "ক"}
                          onChange={(e) =>
                            updateData((d) => {
                              d.mcqQuestions[mIdx].ans = e.target.value;
                            })
                          }
                          className="bg-background border rounded px-2 py-0.5 text-xs font-bold text-primary"
                        >
                          <option value="ক">ক (Option 1)</option>
                          <option value="খ">খ (Option 2)</option>
                          <option value="গ">গ (Option 3)</option>
                          <option value="ঘ">ঘ (Option 4)</option>
                        </select>
                      </div>

                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Exp:</span>
                        <input
                          type="text"
                          value={mcq.exp || mcq.explanation || ""}
                          onChange={(e) =>
                            updateData((d) => {
                              d.mcqQuestions[mIdx].exp = e.target.value;
                            })
                          }
                          placeholder="Explanation"
                          className="flex-1 bg-background border rounded px-2 py-0.5 text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
