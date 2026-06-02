import Link from "next/link";
import {
  Upload,
  Ear,
  NotebookPen,
  ListChecks,
  BookMarked,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/landing/hero";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Upload,
    title: "Upload your recording",
    body: "Drop in audio from any lecture — phone recording, Zoom export, voice memo. Atlas handles long files.",
  },
  {
    icon: Ear,
    title: "Atlas listens closely",
    body: "It transcribes and understands the whole lecture, following the structure the way an attentive student would.",
  },
  {
    icon: NotebookPen,
    title: "Get thorough notes",
    body: "A clean summary, fully detailed sections, and key concepts — saved to your library, ready to study.",
  },
];

const FEATURES = [
  {
    icon: NotebookPen,
    title: "Notes that miss nothing",
    body: "Detailed, structured notes that capture examples, formulas and asides — not a three-line summary.",
  },
  {
    icon: ListChecks,
    title: "Key concepts & definitions",
    body: "Every important term is pulled out and defined, giving you instant study material.",
  },
  {
    icon: Layers,
    title: "A summary up top",
    body: "Each lecture opens with a short overview so you can recall the gist in seconds.",
  },
  {
    icon: BookMarked,
    title: "Your personal library",
    body: "Every lecture is saved to your account and searchable, building a notebook for the whole term.",
  },
  {
    icon: Clock,
    title: "Any lecture length",
    body: "From a 20-minute seminar to a three-hour lab — powered by Gemini's long-audio understanding.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Recordings and notes are tied to your account and protected with row-level security.",
  },
];

const FAQ = [
  {
    q: "What audio formats can I upload?",
    a: "Common formats like MP3, M4A, WAV, AAC, OGG and FLAC all work. If you recorded it on your phone or exported it from a call, it's almost certainly supported.",
  },
  {
    q: "How thorough are the notes?",
    a: "Very. Atlas is built for students who'd rather listen than scribble, so it captures the lecture in full — sections, examples, definitions and a summary — instead of a short recap.",
  },
  {
    q: "Is my data private?",
    a: "Yes. You need an account to upload, and every recording and note is scoped to you with database row-level security. Your API keys live only on the server.",
  },
  {
    q: "Does it work for any subject?",
    a: "Any lecture-style audio — the sciences, humanities, law, medicine. It adapts to the material and pulls out the terms that matter for that subject.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/upload" : "/signup";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero ctaHref={ctaHref} />

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From recording to study-ready in three steps
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 0.1}
                className="relative rounded-[1.5rem] border bg-card p-7"
              >
                <span className="font-mono text-sm text-muted-foreground">
                  0{i + 1}
                </span>
                <span className="mt-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-24 border-y bg-muted/30 py-20"
        >
          <div className="mx-auto max-w-5xl px-4">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                Features
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need from a lecture, written down
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal
                  key={f.title}
                  delay={(i % 3) * 0.08}
                  className="rounded-[1.5rem] border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20">
          <Reveal className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              FAQ
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
          </Reveal>

          <div className="mt-12 divide-y rounded-[1.5rem] border bg-card">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.05} className="p-6 sm:p-7">
                <h3 className="font-semibold tracking-tight">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {item.a}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-4 pb-8">
          <Reveal className="relative overflow-hidden rounded-[2rem] border bg-primary px-6 py-16 text-center text-primary-foreground sm:px-10">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Stop scribbling. Start{" "}
                <span className="font-serif font-normal italic">
                  understanding.
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
                Upload your next lecture and let Atlas take the notes for you.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="group mt-8 h-12 px-6 text-base"
              >
                <Link href={ctaHref}>
                  Get started free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
