"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      richColors
      visibleToasts={1}
      duration={2200}
      position={isMobile ? "top-center" : "bottom-right"}
      mobileOffset={{ top: 12, bottom: 72 }}
      swipeDirections={["top", "bottom", "left", "right"]}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl font-sans text-xs py-2 px-3 rounded-lg select-none",
          description: "group-[.toast]:text-muted-foreground text-[11px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium text-xs",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs",
          closeButton:
            "group-[.toast]:bg-card group-[.toast]:text-foreground group-[.toast]:border-border hover:group-[.toast]:bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
