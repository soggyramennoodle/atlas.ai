/**
 * Newsroom domain model — the article shape, the controlled vocabularies for
 * category / status / severity, plus helpers for slugs, formatting, and the
 * admin allowlist.
 *
 * Pure data + string helpers, safe to import on the client. The one
 * server-only concern (reading NEWSROOM_ADMIN_EMAILS) is `isNewsroomAdmin`,
 * which only reads a server env var and returns a boolean — never call it from
 * a Client Component.
 */

export type NewsroomCategory =
  | "announcement"
  | "product_update"
  | "changelog"
  | "notice"
  | "maintenance"
  | "security"
  | "beta";

export type NewsroomStatus = "draft" | "published" | "archived";

export type NewsroomSeverity = "info" | "warning" | "critical";

export interface NewsroomArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: NewsroomCategory;
  status: NewsroomStatus;
  tags: string[];
  version: string | null;
  severity: NewsroomSeverity | null;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_user_id: string | null;
}

/** Display metadata for each article category. `tone` maps to themed chips. */
export const CATEGORY_META: Record<
  NewsroomCategory,
  { label: string; tone: "primary" | "emerald" | "sky" | "amber" | "rose" | "violet" }
> = {
  announcement: { label: "Announcement", tone: "primary" },
  product_update: { label: "Product Update", tone: "emerald" },
  changelog: { label: "Changelog", tone: "sky" },
  notice: { label: "Notice", tone: "violet" },
  maintenance: { label: "Maintenance", tone: "amber" },
  security: { label: "Security", tone: "rose" },
  beta: { label: "Beta", tone: "violet" },
};

export const CATEGORY_ORDER: NewsroomCategory[] = [
  "announcement",
  "product_update",
  "changelog",
  "notice",
  "maintenance",
  "security",
  "beta",
];

export const STATUS_META: Record<NewsroomStatus, { label: string }> = {
  draft: { label: "Draft" },
  published: { label: "Published" },
  archived: { label: "Archived" },
};

export const SEVERITY_META: Record<NewsroomSeverity, { label: string }> = {
  info: { label: "Info" },
  warning: { label: "Warning" },
  critical: { label: "Critical" },
};

export function categoryLabel(category: string): string {
  return CATEGORY_META[category as NewsroomCategory]?.label ?? category;
}

/**
 * Turn a title into a URL-safe slug. Lowercases, strips accents, replaces
 * non-alphanumerics with hyphens, collapses repeats.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Format an ISO timestamp as an editorial date, e.g. "June 3, 2026". */
export function formatArticleDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** A compact relative-ish date for cards, e.g. "Jun 3". */
export function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Whether the given email is allowed to publish to the Newsroom.
 *
 * SERVER ONLY in spirit — reads NEWSROOM_ADMIN_EMAILS (a non-public env var,
 * so it is undefined in the browser). The allowlist is comma-separated and
 * compared case-insensitively. An empty/missing allowlist denies everyone.
 */
export function isNewsroomAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = process.env.NEWSROOM_ADMIN_EMAILS;
  if (!allow) return false;
  const set = allow
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return set.includes(email.trim().toLowerCase());
}
