"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
 * Client list for the public Newsroom: a featured lead story, category filter
 * tabs (only those present in the data), and an animated grid of cards.
 */
export function NewsroomList({ articles }: { articles: ListArticle[] }) {
  const [filter, setFilter] = useState<Filter>("all");

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

  return (
    <div className="space-y-10">
      {/* Featured lead — only on the "All" view so filtering feels focused. */}
      <AnimatePresence initial={false} mode="popLayout">
        {filter === "all" && lead && (
          <motion.div
            key="lead"
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ArticleCard article={lead} featured />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
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
                    "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="newsroom-tab"
                      className="absolute inset-0 -z-10 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      {/* Grid */}
      {rest.length > 0 ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {rest.map((article) => (
              <motion.div
                key={article.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <ArticleCard article={article} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <p className="rounded-2xl border border-dashed bg-card/40 py-12 text-center text-sm text-muted-foreground">
          Nothing under this category yet.
        </p>
      )}
    </div>
  );
}
