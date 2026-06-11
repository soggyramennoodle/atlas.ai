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
    <div className="font-heading px-4 pb-24 pt-28 sm:pt-32">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href="/newsroom"
          className="inline-flex items-center gap-1.5 text-[13px] text-black/60 transition-colors hover:text-[#0d0d0d]"
        >
          <ArrowLeft className="size-4" />
          Newsroom
        </Link>

        {/* Header */}
        <header className="mt-6 border-b border-black/[0.08] pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={article.category} />
            {article.severity && <SeverityChip severity={article.severity} />}
            {article.version && (
              <span className="rounded-full border border-black/10 bg-black/[0.04] px-3 py-1 text-[11px] font-medium tracking-[1.5px] text-black/60">
                {article.version}
              </span>
            )}
          </div>

          <h1
            className="font-heading mt-5 text-balance font-normal leading-[1.02] tracking-[-1.02px] text-[#0d0d0d]"
            style={{ fontSize: "clamp(2.25rem, 5vw, 56px)" }}
          >
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mt-4 text-pretty text-[17px] leading-[1.6] text-black/60">
              {article.excerpt}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-black/45">
            <time dateTime={article.published_at ?? undefined}>
              {formatArticleDate(article.published_at)}
            </time>
            {article.tags.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span key={tag} className="text-black/40">
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
        <div className="mt-12 border-t border-black/[0.08] pt-8">
          <Link
            href="/newsroom"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0d0d0d] transition-colors hover:text-black/70"
          >
            <ArrowLeft className="size-4" />
            Back to Newsroom
          </Link>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto mt-16 w-full max-w-5xl">
          <h2 className="text-balance text-[#0d0d0d]">
            <span className="font-heading text-lg font-medium tracking-tight">
              More from the{" "}
            </span>
            <span className="font-instrument text-lg italic font-normal tracking-tight">
              Newsroom
            </span>
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
