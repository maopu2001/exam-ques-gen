"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { compilerEngine } from "@/lib/compiler/engine";
import { isFastCacheValid } from "@/lib/compiler/asset-cache";

interface AppSplashScreenProps {
  onPreloadComplete?: () => void;
}

export function AppSplashScreen({ onPreloadComplete }: AppSplashScreenProps) {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [preloadState, setPreloadState] = useState<{
    message: string;
    percent: number;
    speed?: string;
  }>({
    message: "Connecting to server...",
    percent: 0,
    speed: "",
  });

  useEffect(() => {
    let isCancelled = false;

    if (isFastCacheValid()) {
      onPreloadComplete?.();
      const fadeTimer = setTimeout(() => setIsFadingOut(true), 100);
      const hideTimer = setTimeout(() => setShouldRender(false), 400);

      // Non-blocking background verification and pre-warm
      compilerEngine.warmup().catch(() => {});

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }

    async function warmUpAssets() {
      try {
        await compilerEngine.warmup((prog) => {
          if (!isCancelled) {
            setPreloadState({
              message: prog.message,
              percent: prog.percent,
              speed: prog.speed,
            });
          }
        });
      } catch {
        // Fallback gracefully on warm-up warnings
      } finally {
        if (!isCancelled) {
          onPreloadComplete?.();
          setTimeout(() => setIsFadingOut(true), 300);
          setTimeout(() => setShouldRender(false), 800);
        }
      }
    }

    warmUpAssets();

    return () => {
      isCancelled = true;
    };
  }, [onPreloadComplete]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background select-none transition-opacity duration-300 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5 text-center max-w-sm px-6">
        {/* Breathing Logo Squircle */}
        <div className="relative size-20 rounded-2xl p-3 bg-card border border-border/80 shadow-xl flex items-center justify-center animate-in zoom-in-90 duration-300">
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
          <Image
            src="/logo.png"
            alt="Exam Studio Logo"
            width={64}
            height={64}
            className="size-full object-contain relative z-10 drop-shadow-sm"
            priority
          />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Exam Studio
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Automated LaTeX Examination Studio
          </p>
        </div>

        {/* 30-Day Preload Progress Card */}
        <div className="w-64 space-y-2 pt-1">
          {/* Progress Bar Track */}
          <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/90 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(4, preloadState.percent)}%` }}
            />
          </div>

          {/* Status Details */}
          <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono">
            <span
              className="truncate max-w-[155px] text-left text-foreground/80 font-medium"
              title={preloadState.message}
            >
              {preloadState.message}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {preloadState.speed ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {preloadState.speed}
                </span>
              ) : null}
              <span className="font-bold text-primary">
                {preloadState.percent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
