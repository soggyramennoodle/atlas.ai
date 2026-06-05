import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryChip, SeverityChip } from "@/components/newsroom/chips";
import { formatShortDate, type NewsroomArticle } from "@/lib/newsroom";
import { cn } from "@/lib/utils";

type CardArticle = Pick<
  NewsroomArticle,
  | "slug"
  | "title"
  | "excerpt"
  | "category"
  | "version"
  | "severity"
  | "tags"
  | "published_at"
>;

/**
 * Standard Newsroom article card. `featured` renders the larger lead variant
 * (used for the most important/most recent story at the top of the list).
 */
export function ArticleCard({
  article,
  featured = false,
}: {
  article: CardArticle;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/newsroom/${article.slug}`}
      className={cn(
        "glow-card group relative flex flex-col rounded-2xl border bg-card/70 p-6 transition hover:-translate-y-0.5 hover:border-primary/30",
        featured && "sm:p-8"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={article.category} />
        {article.severity && <SeverityChip severity={article.severity} />}
        {article.version && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
            {article.version}
          </span>
        )}
      </div>

      <h3
        className={cn(
          "mt-4 font-display font-bold leading-[1.05] tracking-tight text-balance",
          featured ? "text-3xl sm:text-4xl" : "text-xl"
        )}
      >
        {article.title}
      </h3>

      <p
        className={cn(
          "mt-2 flex-1 leading-relaxed text-muted-foreground text-pretty",
          featured ? "text-base line-clamp-3" : "text-sm line-clamp-2"
        )}
      >
        {article.excerpt}
      </p>

      <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
        <time dateTime={article.published_at ?? undefined}>
          {formatShortDate(article.published_at)}
        </time>
        {article.tags.length > 0 && (
          <span className="hidden items-center gap-1.5 sm:flex">
            {article.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-muted-foreground/70">
                #{tag}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-foreground/80 transition group-hover:text-primary">
          Read
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
