"use client";

import { useMemo, useState } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
} from "framer-motion";
import { ArticleCard } from "@/components/newsroom/article-card";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type NewsroomArticle,
  type NewsroomCategory,
} from "@/lib/newsroom";
import { cn } from "@/lib/utils";

type ListArticle = Pick<
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
>;

type Filter = "all" | NewsroomCategory;

/**
 * Client list for the public Newsroom: category filter tabs, a featured lead
 * story (on the "All" view), and a grid of cards.
 *
 * Motion: filtering does a single keyed crossfade of the whole content block —
 * opacity + a small transform only, never `layout`. Animating per-card layout
 * positions (the previous approach) forced a full grid reflow on every toggle,
 * which is what caused the jank. The tabs sit above the content so they never
 * shift when the featured lead appears/disappears.
 */
export function NewsroomList({ articles }: { articles: ListArticle[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const reduce = useReducedMotion();

  // The lead story: the pinned/featured one, else the most recent (the list
  // arrives newest-first). The lead is only shown on the unfiltered view.
  const lead = useMemo(
    () => articles.find((a) => a.featured) ?? articles[0],
    [articles]
  );

  const presentCategories = useMemo(() => {
    const set = new Set(articles.map((a) => a.category));
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [articles]);

  const rest = useMemo(() => {
    const showingLead = filter === "all" && lead;
    return articles.filter((a) => {
      if (showingLead && a.id === lead.id) return false;
      if (filter !== "all" && a.category !== filter) return false;
      return true;
    });
  }, [articles, filter, lead]);

  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...presentCategories.map((c) => ({
      value: c as Filter,
      label: CATEGORY_META[c].label,
    })),
  ];

  const showLead = filter === "all" && lead;

  return (
    <div className="space-y-8">
      {/* Filter tabs — pinned above the content so they never reflow. */}
      {tabs.length > 2 && (
        <LayoutGroup>
          <div
            role="tablist"
            aria-label="Filter by category"
            className="flex flex-wrap gap-2"
          >
            {tabs.map((tab) => {
              const active = filter === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    "relative rounded-[4px] border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/25 hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="newsroom-tab"
                      className="absolute inset-0 -z-10 rounded-[3px] bg-foreground"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      {/* Content — one keyed crossfade per filter change. No layout tweening. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: reduce ? 0 : -6,
            transition: { duration: reduce ? 0.08 : 0.13, ease: "easeIn" },
          }}
          transition={{ duration: reduce ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-8"
        >
          {showLead && <ArticleCard article={lead} featured />}

          {rest.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
