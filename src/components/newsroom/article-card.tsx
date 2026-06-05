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
        "group icon-animate relative flex flex-col rounded-[4px] border bg-card p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-300 ease-out hover:-translate-y-1 hover:border-primary/35 hover:bg-secondary/45 hover:shadow-[0_18px_46px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured && "sm:p-8"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={article.category} />
        {article.severity && <SeverityChip severity={article.severity} />}
        {article.version && (
          <span className="rounded-[3px] border border-border bg-muted/40 px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
            {article.version}
          </span>
        )}
      </div>

      <h3
        className={cn(
          "mt-4 font-bold leading-[1.05] tracking-tight text-balance",
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
          <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-1" />
        </span>
      </div>
    </Link>
  );
}
