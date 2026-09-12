"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AppSplashScreenProps {
  isReady: boolean;
}

export function AppSplashScreen({ isReady }: AppSplashScreenProps) {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isReady) {
      // Begin smooth fade out
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 350);

      // Unmount from DOM after animation completes
      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
      }, 850);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [isReady]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-xs px-6">
        {/* Breathing Logo Squircle */}
        <div className="relative size-20 rounded-2xl p-3 bg-card border border-border/80 shadow-xl flex items-center justify-center animate-in zoom-in-90 duration-500">
          {/* Subtle Ambient Glow */}
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

        {/* Minimal Progress Line (Royal Indigo -> NCTB Emerald) */}
        <div className="w-32 h-1 bg-muted rounded-full overflow-hidden relative mt-2">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-accent rounded-full w-full animate-[shimmer_1.4s_infinite_linear] origin-left" />
        </div>
      </div>
    </div>
  );
}
