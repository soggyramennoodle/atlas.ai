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
    <div data-tour="dashboard-greeting">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {local?.date || " "}
      </p>
      <h1 className="mt-2 inline-block text-4xl font-bold leading-[0.98] tracking-[-0.02em] sm:text-5xl">
        {local?.greeting ?? "Welcome back"},{" "}
        <span className="relative">
          <span className="text-primary">{name}</span>
          <span className="absolute -bottom-1 left-0 h-[2px] w-full bg-primary/50" />
        </span>
      </h1>
      <p className="mt-3 text-muted-foreground">{local?.line ?? " "}</p>
    </div>
  );
}
