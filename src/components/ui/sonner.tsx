"use client";

import { useEffect, useState } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** True when marketing/auth layouts have tagged the document for cinematic UI. */
function useCinematicSurface() {
  const [cinematic, setCinematic] = useState(false);

  useEffect(() => {
    const read = () =>
      document.documentElement.getAttribute("data-atlas-surface") ===
      "cinematic";
    setCinematic(read());
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-atlas-surface"],
    });
    return () => observer.disconnect();
  }, []);

  return cinematic;
}

const Toaster = ({ richColors = true, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const cinematic = useCinematicSurface();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors={richColors && !cinematic}
      icons={{
        success: (
          <CircleCheckIcon className="size-3.5" strokeWidth={2} aria-hidden />
        ),
        info: <InfoIcon className="size-3.5" strokeWidth={2} aria-hidden />,
        warning: (
          <TriangleAlertIcon className="size-3.5" strokeWidth={2} aria-hidden />
        ),
        error: <XIcon className="size-3.5" strokeWidth={2} aria-hidden />,
        loading: (
          <Loader2Icon
            className="size-3.5 animate-spin"
            strokeWidth={2}
            aria-hidden
          />
        ),
      }}
      toastOptions={
        cinematic
          ? {
              classNames: {
                toast: "font-heading atlas-cinematic-toast",
                title: "font-medium tracking-tight",
                description: "font-normal",
              },
            }
          : undefined
      }
      style={
        cinematic
          ? ({
              "--border-radius": "20px",
              "--normal-bg": "#ffffff",
              "--normal-text": "#0d0d0d",
              "--normal-border": "rgba(0, 0, 0, 0.08)",
            } as React.CSSProperties)
          : ({
              "--normal-bg": "var(--popover)",
              "--normal-text": "var(--popover-foreground)",
              "--normal-border": "var(--border)",
              "--border-radius": "var(--radius)",
            } as React.CSSProperties)
      }
      {...props}
    />
  );
};

export { Toaster };
