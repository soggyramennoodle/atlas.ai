import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CategoryChip, SeverityChip } from "@/components/newsroom/chips";
import { ArticleCard } from "@/components/newsroom/article-card";
import { renderMarkdown, markdownToPlainText } from "@/lib/markdown";
import { sanitizeNoteHtml } from "@/lib/notes-html";
import { formatArticleDate, type NewsroomArticle } from "@/lib/newsroom";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsroom_articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as NewsroomArticle | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Newsroom" };
  return {
    title: article.title,
    description: article.excerpt || markdownToPlainText(article.body, 160),
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const supabase = await createClient();
  const { data: relatedData } = await supabase
    .from("newsroom_articles")
    .select(
      "id, slug, title, excerpt, category, version, severity, tags, published_at"
    )
    .eq("status", "published")
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(3);

  const related = (relatedData ?? []) as Pick<
    NewsroomArticle,
    | "id"
    | "slug"
    | "title"
    | "excerpt"
    | "category"
    | "version"
    | "severity"
    | "tags"
    | "published_at"
  >[];

  const bodyHtml = sanitizeNoteHtml(renderMarkdown(article.body));

  return (
    <div className="px-4 pb-24 pt-28 sm:pt-32">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href="/newsroom"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Newsroom
        </Link>

        {/* Header */}
        <header className="mt-6 border-b pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={article.category} />
            {article.severity && <SeverityChip severity={article.severity} />}
            {article.version && (
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                {article.version}
              </span>
            )}
          </div>

          <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
              {article.excerpt}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <time dateTime={article.published_at ?? undefined}>
              {formatArticleDate(article.published_at)}
            </time>
            {article.tags.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span key={tag} className="text-muted-foreground/80">
                      #{tag}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Body */}
        <div
          className="article-prose mt-8"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {/* Back link */}
        <div className="mt-12 border-t pt-8">
          <Link
            href="/newsroom"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:opacity-80"
          >
            <ArrowLeft className="size-4" />
            Back to Newsroom
          </Link>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto mt-16 w-full max-w-5xl">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            More from the Newsroom
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
