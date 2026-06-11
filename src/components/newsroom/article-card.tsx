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
        "group font-heading relative flex flex-col rounded-[20px] border border-black/[0.08] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
        featured && "sm:p-8"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={article.category} />
        {article.severity && <SeverityChip severity={article.severity} />}
        {article.version && (
          <span className="rounded-full border border-black/10 bg-black/[0.04] px-3 py-1 text-[11px] font-medium tracking-[1.5px] text-black/60">
            {article.version}
          </span>
        )}
      </div>

      <h3
        className={cn(
          "mt-4 font-medium leading-[1.1] tracking-tight text-balance text-[#0d0d0d]",
          featured ? "text-3xl sm:text-4xl" : "text-xl"
        )}
      >
        {article.title}
      </h3>

      <p
        className={cn(
          "mt-2 flex-1 leading-relaxed text-black/60 text-pretty",
          featured ? "text-base line-clamp-3" : "text-sm line-clamp-2"
        )}
      >
        {article.excerpt}
      </p>

      <div className="mt-5 flex items-center gap-3 text-xs text-black/45">
        <time dateTime={article.published_at ?? undefined}>
          {formatShortDate(article.published_at)}
        </time>
        {article.tags.length > 0 && (
          <span className="hidden items-center gap-1.5 sm:flex">
            {article.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-black/40">
                #{tag}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-[#0d0d0d] transition group-hover:text-black/70">
          Read
          <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-1" />
        </span>
      </div>
    </Link>
  );
}
