"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import {
  slugify,
  CATEGORY_ORDER,
  type NewsroomCategory,
  type NewsroomStatus,
  type NewsroomSeverity,
} from "@/lib/newsroom";

export interface ArticleInput {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  status: string;
  tags: string[];
  version: string;
  severity: string;
  featured: boolean;
  published_at: string; // ISO or "" (datetime-local value already converted)
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  id?: string;
  slug?: string;
}

const STATUSES: NewsroomStatus[] = ["draft", "published", "archived"];
const SEVERITIES: NewsroomSeverity[] = ["info", "warning", "critical"];

function revalidateAll(slug?: string) {
  revalidatePath("/admin/newsroom");
  revalidatePath("/newsroom");
  if (slug) revalidatePath(`/newsroom/${slug}`);
}

/**
 * Create (id === null) or update an article. Verifies the caller is a Newsroom
 * admin, validates input, then writes with the service-role client (RLS has no
 * write policy, so all mutations flow through here). Returns a plain result.
 */
export async function saveArticle(
  id: string | null,
  input: ArticleInput
): Promise<SaveResult> {
  const user = await getNewsroomAdmin();
  if (!user) return { ok: false, error: "Not authorized." };

  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (!excerpt) return { ok: false, error: "Excerpt is required." };
  if (!body) return { ok: false, error: "Body is required." };

  const slug = slugify(input.slug.trim() || title);
  if (!slug) return { ok: false, error: "Could not derive a valid slug." };

  const category = (
    CATEGORY_ORDER.includes(input.category as NewsroomCategory)
      ? input.category
      : "announcement"
  ) as NewsroomCategory;

  const status = (
    STATUSES.includes(input.status as NewsroomStatus) ? input.status : "draft"
  ) as NewsroomStatus;

  const severity =
    input.severity && SEVERITIES.includes(input.severity as NewsroomSeverity)
      ? (input.severity as NewsroomSeverity)
      : null;

  const tags = input.tags
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  // Publishing without an explicit date stamps "now"; clearing publish keeps
  // any prior date so unpublish→republish doesn't lose the original time.
  let publishedAt: string | null = input.published_at
    ? new Date(input.published_at).toISOString()
    : null;
  if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  const supabase = createAdminClient();

  const row = {
    title,
    slug,
    excerpt,
    body,
    category,
    status,
    tags,
    version: input.version.trim() || null,
    severity,
    featured: !!input.featured,
    published_at: publishedAt,
  };

  if (id) {
    const { data, error } = await supabase
      .from("newsroom_articles")
      .update(row)
      .eq("id", id)
      .select("id, slug")
      .single();
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "That slug is already in use." };
      return { ok: false, error: error.message };
    }
    revalidateAll(data.slug);
    return { ok: true, id: data.id, slug: data.slug };
  }

  const { data, error } = await supabase
    .from("newsroom_articles")
    .insert({ ...row, author_user_id: user.id })
    .select("id, slug")
    .single();
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "That slug is already in use." };
    return { ok: false, error: error.message };
  }
  revalidateAll(data.slug);
  return { ok: true, id: data.id, slug: data.slug };
}

/** Quick status change from the admin list (publish / unpublish / archive). */
export async function setArticleStatus(
  id: string,
  status: NewsroomStatus
): Promise<SaveResult> {
  const user = await getNewsroomAdmin();
  if (!user) return { ok: false, error: "Not authorized." };
  if (!STATUSES.includes(status))
    return { ok: false, error: "Invalid status." };

  const supabase = createAdminClient();

  // Stamp a publish date the first time an article goes live.
  const patch: Record<string, unknown> = { status };
  if (status === "published") {
    const { data: existing } = await supabase
      .from("newsroom_articles")
      .select("published_at")
      .eq("id", id)
      .single();
    if (!existing?.published_at) patch.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("newsroom_articles")
    .update(patch)
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateAll(data.slug);
  return { ok: true, slug: data.slug };
}

/** Permanently delete an article. Confirmed in the UI before calling. */
export async function deleteArticle(id: string): Promise<SaveResult> {
  const user = await getNewsroomAdmin();
  if (!user) return { ok: false, error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("newsroom_articles")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
