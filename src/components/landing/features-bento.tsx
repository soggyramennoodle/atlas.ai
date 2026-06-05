import { ListChecks, Layers, BookMarked, Clock } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

/** A boxed, neutral icon chip. Colour is reserved for the AI glow. */
function IconChip({
  children,
  size = "md",
}: {
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "icon-animate grid place-items-center rounded-[4px] border border-border bg-background text-foreground",
        size === "lg" ? "size-12" : "size-10"
      )}
    >
      {children}
    </span>
  );
}

function Cell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group icon-animate relative flex flex-col overflow-hidden rounded-[4px] border border-border bg-card p-6 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_28px_-18px_rgba(0,0,0,0.28)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Looping waveform that "writes" note lines - the one AI affordance visual. */
function WaveToNotes() {
  return (
    <div className="mt-6 flex flex-1 flex-col gap-4 rounded-[4px] border border-border bg-background p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 items-end gap-[3px]">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="h-full w-[3px] origin-bottom rounded-full bg-primary/70 transform-gpu"
              style={{
                transform: "scaleY(0.4)",
                animation: `atlas-wave 1.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          transcribing
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-2 w-full origin-left rounded-full bg-foreground/10 transform-gpu"
            style={{
              transform: "scaleX(0.4)",
              animation: `atlas-line 3s ease-in-out ${(i * 0.35).toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A small fanned stack of note cards - the personal library. */
function LibraryCards() {
  const cards = [
    { title: "Lecture 4: Mitosis", tag: "Biology", x: -54, rot: -7, z: 10, lines: 3 },
    { title: "Limits and Continuity", tag: "Calculus", x: 0, rot: 2, z: 20, lines: 4 },
    { title: "The French Revolution", tag: "History", x: 54, rot: 8, z: 10, lines: 3 },
  ];
  return (
    <div className="mt-6 grid h-40 place-items-center">
      <div className="relative h-36 w-full">
        {cards.map((c) => (
          <div
            key={c.title}
            className="absolute left-1/2 top-1/2 w-36 rounded-[4px] border border-border bg-background p-3 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.3)]"
            style={{
              transform: `translate(-50%, -50%) translateX(${c.x}px) rotate(${c.rot}deg)`,
              zIndex: c.z,
            }}
          >
            <p className="truncate text-[0.72rem] font-semibold tracking-tight text-foreground">
              {c.title}
            </p>
            <div className="mt-2 space-y-1.5">
              {Array.from({ length: c.lines }).map((_, j) => (
                <div
                  key={j}
                  className="h-1.5 rounded-full bg-foreground/10"
                  style={{ width: `${90 - j * 14}%` }}
                />
              ))}
            </div>
            <span className="mt-2.5 inline-block rounded-[4px] border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {c.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeaturesBento() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-border py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal className="max-w-[820px]">
          <h2 className="text-balance text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Everything from a lecture,{" "}
            <span className="text-primary">written down.</span>
          </h2>
          <p className="mt-4 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            Not a three-line recap. The full picture, organized the way you would
            study it.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[minmax(0,1fr)]">
          {/* AI hero cell - signed by the fluid AI edge ring on its border. */}
          <Reveal className="md:col-span-2 md:row-span-2 md:flex" delay={0.04}>
            <Cell className="ai-ring h-full w-full">
              <div className="relative flex h-full flex-col">
                <IconChip size="lg">
                  <ListChecks className="size-5" />
                </IconChip>
                <h3 className="mt-4 text-2xl font-bold tracking-tight">
                  Notes that miss nothing
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Detailed, structured notes that capture examples, formulas and
                  asides, not a short summary. Atlas writes them the way a
                  diligent student would, in full.
                </p>
                <WaveToNotes />
              </div>
            </Cell>
          </Reveal>

          <Reveal className="md:flex" delay={0.1}>
            <Cell className="h-full w-full">
              <IconChip>
                <Layers className="size-5" />
              </IconChip>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                A summary up top
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Each lecture opens with a short overview, so you recall the gist
                in seconds.
              </p>
            </Cell>
          </Reveal>

          <Reveal className="md:flex" delay={0.16}>
            <Cell className="h-full w-full">
              <IconChip>
                <Clock className="size-5" />
              </IconChip>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                Any lecture length
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                From a 20-minute seminar to a three-hour lab, powered by
                long-audio understanding.
              </p>
            </Cell>
          </Reveal>

          {/* Wide library cell spans the full row, breaking the grid rhythm. */}
          <Reveal className="md:col-span-3 md:flex" delay={0.1}>
            <Cell className="h-full w-full sm:flex-row sm:items-center sm:gap-10">
              <div className="sm:max-w-sm">
                <IconChip>
                  <BookMarked className="size-5" />
                </IconChip>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  Your personal library
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Every lecture saved and searchable, a notebook for the whole
                  term.
                </p>
              </div>
              <div className="mt-2 flex-1 sm:mt-0">
                <LibraryCards />
              </div>
            </Cell>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
