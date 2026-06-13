"use client";

import { useEffect, useState } from "react";

const LINES = [
  "Ready when your next lecture is.",
  "Let's turn today's classes into notes.",
  "Press record. Atlas does the rest.",
  "Your library is one lecture away from growing.",
  "Listen well today. We'll handle the writing.",
];

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

interface Local {
  greeting: string;
  line: string;
  date: string;
}

/**
 * Time-of-day greeting + rotating subtitle. Computed on the client (after
 * mount) so the local time never mismatches the server render. Chosen over a
 * Gemini call: instant, free, and good enough to feel alive.
 */
export function Greeting({ name }: { name: string }) {
  const [local, setLocal] = useState<Local | null>(null);

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only hydration-safe values
    setLocal({
      greeting: timeGreeting(),
      date: now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      line: LINES[Math.floor(now.getTime() / 86_400_000) % LINES.length],
    });
  }, []);

  return (
    <div
      data-tour="dashboard-greeting"
      // Soft white backlight so the dark heading lifts off the contrasty scene.
      className="[text-shadow:0_2px_16px_rgba(255,255,255,0.7)]"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
        {local?.date || " "}
      </p>
      <h1 className="mt-3 inline-block text-balance text-4xl font-normal leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-6xl">
        {local?.greeting ?? "Welcome back"},{" "}
        <span className="font-instrument italic">{name}</span>
      </h1>
      <p className="mt-3 text-base text-[#0d0d0d]/60">{local?.line ?? " "}</p>
    </div>
  );
}
