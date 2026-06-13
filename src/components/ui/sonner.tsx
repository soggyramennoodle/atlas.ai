"use client";

import { useEffect, useState } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** The document's Atlas surface tag (set by MarketingThemeLock): "cinematic" for
 *  the light marketing/auth surfaces, "app" for the dark-glass signed-in app. */
function useAtlasSurface(): "cinematic" | "app" | null {
  const [surface, setSurface] = useState<"cinematic" | "app" | null>(null);

  useEffect(() => {
    const read = () => {
      const s = document.documentElement.getAttribute("data-atlas-surface");
      return s === "cinematic" || s === "app" ? s : null;
    };
    // Microtask defer satisfies the no-sync-setState-in-effect rule; the
    // observer now actually writes state (it previously only re-read).
    const update = () => setSurface(read());
    void Promise.resolve().then(update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-atlas-surface"],
    });
    return () => observer.disconnect();
  }, []);

  return surface;
}

const Toaster = ({ richColors = true, ...props }: ToasterProps) => {
  const surface = useAtlasSurface();
  // Both scoped surfaces drop richColors + take the Atlas font; the dark vs light
  // look is carried by the data-atlas-surface CSS in globals.css.
  const cinematic = surface === "cinematic" || surface === "app";
  const isApp = surface === "app";

  return (
    <Sonner
      theme="light"
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
        isApp
          ? ({
              "--border-radius": "18px",
              "--normal-bg": "rgba(18, 18, 20, 0.72)",
              "--normal-text": "#ffffff",
              "--normal-border": "rgba(255, 255, 255, 0.14)",
            } as React.CSSProperties)
          : cinematic
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
