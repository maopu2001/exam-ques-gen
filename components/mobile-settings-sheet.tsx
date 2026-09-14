"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  AlignLeft,
  Trash2,
  Upload,
  ClipboardPaste,
} from "lucide-react";

interface MobileSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  includeSolutions: boolean;
  onIncludeSolutionsChange: (include: boolean) => void;
  onFormatJson: () => void;
  onClearJson: () => void;
  onResetSample: () => void;
  onOpenAiPrompt: () => void;
  onUploadJson?: () => void;
  onPasteClipboard?: () => void;
}

export function MobileSettingsSheet({
  open,
  onOpenChange,
  selectedPreset,
  onPresetChange,
  includeSolutions,
  onIncludeSolutionsChange,
  onFormatJson,
  onClearJson,
  onResetSample,
  onOpenAiPrompt,
  onUploadJson,
  onPasteClipboard,
}: MobileSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] overflow-y-auto p-5 pb-8 space-y-5"
      >
        <SheetHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <SheetTitle>Exam Options & Tools</SheetTitle>
          </div>
          <SheetDescription>
            Configure compilation presets and quick actions
          </SheetDescription>
        </SheetHeader>

        {/* 1. Preset Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Exam Curriculum Preset
          </label>
          <Select
            value={selectedPreset}
            onValueChange={(val) => {
              onPresetChange(val);
              onOpenChange(false);
            }}
          >
            <SelectTrigger className="h-9 w-full text-xs font-medium bg-card">
              <SelectValue placeholder="Select Exam Preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ssc_math">SSC General Math (গণিত)</SelectItem>
              <SelectItem value="ssc_hmath">
                SSC Higher Math (উচ্চতর গণিত)
              </SelectItem>
              <SelectItem value="ssc_physics">
                SSC Physics (পদার্থবিজ্ঞান)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 2. Solutions Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card/60">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground">
              Include MCQ Solutions
            </span>
            <p className="text-[11px] text-muted-foreground">
              Attach answer explanations to master PDF
            </p>
          </div>
          <input
            type="checkbox"
            checked={includeSolutions}
            onChange={(e) => onIncludeSolutionsChange(e.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>

        {/* 3. Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start px-3"
            onClick={() => {
              onUploadJson?.();
              onOpenChange(false);
            }}
          >
            <Upload className="size-3.5 text-primary" />
            Import JSON File
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start px-3"
            onClick={() => {
              onPasteClipboard?.();
              onOpenChange(false);
            }}
          >
            <ClipboardPaste className="size-3.5 text-primary" />
            Paste Clipboard
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start px-3"
            onClick={() => {
              onFormatJson();
              onOpenChange(false);
            }}
          >
            <AlignLeft className="size-3.5 text-primary" />
            Format JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start px-3 text-destructive hover:bg-destructive/10"
            onClick={() => {
              onClearJson();
              onOpenChange(false);
            }}
          >
            <Trash2 className="size-3.5" />
            Clear Editor
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start px-3 col-span-2"
            onClick={() => {
              onOpenAiPrompt();
              onOpenChange(false);
            }}
          >
            <Sparkles className="size-3.5 text-yellow-600" />
            Open AI Prompt Assistant
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start px-3 col-span-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onResetSample();
              onOpenChange(false);
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset to Sample 5-Section Exam
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
