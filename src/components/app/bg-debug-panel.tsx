"use client";

import { useEffect, useState } from "react";

/**
 * DEV-ONLY background/glass tuner. Writes CSS custom properties on :root that
 * AppCanvas (background layers) and GLASS_DARK (glass fill) read, so the whole
 * feel can be dialled in live. When you're happy: read the values off this
 * panel, tell the agent, and they get baked into the var() fallbacks in
 * glass.tsx — then this component + its render in AppCanvas are deleted.
 *
 * Not shipped to production: AppCanvas only renders this when NODE_ENV is
 * "development".
 */
const CONTROLS = [
  { var: "--atlas-bg-dim", label: "BG dim (darken)", min: 0, max: 0.8, step: 0.01, def: 0.2 },
  { var: "--atlas-bg-haze", label: "BG haze (fade white)", min: 0, max: 0.8, step: 0.01, def: 0 },
  { var: "--atlas-bg-blur", label: "BG blur (px)", min: 0, max: 20, step: 0.5, def: 0 },
  { var: "--atlas-glass", label: "Glass fill alpha", min: 0.1, max: 0.85, step: 0.01, def: 0.46 },
] as const;

export function BgDebugPanel() {
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(CONTROLS.map((c) => [c.var, c.def]))
  );
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const c of CONTROLS) root.style.setProperty(c.var, String(vals[c.var]));
  }, [vals]);

  function copy() {
    const text = CONTROLS.map((c) => `${c.var}: ${vals[c.var]}`).join("\n");
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] w-64 select-none rounded-2xl border border-white/15 bg-[#0d0d0d]/85 p-3 text-white shadow-2xl backdrop-blur-md"
      style={{ fontFamily: "ui-sans-serif, system-ui" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          bg / glass tuner
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded px-1.5 text-white/60 hover:text-white"
        >
          {open ? "–" : "+"}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          {CONTROLS.map((c) => (
            <label key={c.var} className="block">
              <span className="flex justify-between text-[11px] text-white/70">
                {c.label}
                <span className="tabular-nums text-white">{vals[c.var]}</span>
              </span>
              <input
                type="range"
                min={c.min}
                max={c.max}
                step={c.step}
                value={vals[c.var]}
                onChange={(e) =>
                  setVals((v) => ({ ...v, [c.var]: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-white"
              />
            </label>
          ))}
          <button
            onClick={copy}
            className="w-full rounded-lg border border-white/20 bg-white/10 py-1.5 text-xs font-medium hover:bg-white/20"
          >
            {copied ? "copied ✓" : "copy values"}
          </button>
        </div>
      )}
    </div>
  );
}
