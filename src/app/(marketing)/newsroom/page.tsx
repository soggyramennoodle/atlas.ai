import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewsroomList } from "@/components/newsroom/newsroom-list";
import type { NewsroomArticle } from "@/lib/newsroom";

export const metadata: Metadata = {
  title: "Newsroom",
  description:
    "Announcements, product updates, changelogs and notices from the Atlas team.",
};

// Always reflect the latest published articles.
export const dynamic = "force-dynamic";

export default async function NewsroomPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsroom_articles")
    .select(
      "id, slug, title, excerpt, category, version, severity, tags, featured, published_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const articles = (data ?? []) as Pick<
    NewsroomArticle,
    | "id"
    | "slug"
    | "title"
    | "excerpt"
    | "category"
    | "version"
    | "severity"
    | "tags"
    | "featured"
    | "published_at"
  >[];

  return (
    <div className="px-4 pb-24 pt-28 sm:pt-32">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <header className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Newspaper className="size-3.5" />
            Newsroom
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            What&apos;s new at Atlas
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Product updates, release notes, announcements and service notices —
            straight from the team building Atlas.
          </p>
        </header>

        <div className="mt-12">
          {articles.length > 0 ? (
            <NewsroomList articles={articles} />
          ) : (
            <EmptyNewsroom />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyNewsroom() {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card/50 px-6 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 w-40 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Newspaper className="size-6" />
      </div>
      <h2 className="relative mt-5 font-display text-xl font-semibold tracking-tight">
        No stories yet
      </h2>
      <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        We&apos;re just getting started. Product news and release notes will
        appear here soon.
      </p>
    </div>
  );
}
