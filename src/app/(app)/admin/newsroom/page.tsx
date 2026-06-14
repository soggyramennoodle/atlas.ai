import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Newspaper, ExternalLink } from "lucide-react";
import { AdminArticleList } from "@/components/newsroom/admin-article-list";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import {
  ADMIN_BTN,
  ADMIN_BTN_PRIMARY,
  ADMIN_EYEBROW,
  AdminEmpty,
} from "@/components/admin/admin-kit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NewsroomArticle } from "@/lib/newsroom";

export const metadata: Metadata = { title: "Newsroom · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminNewsroomPage() {
  // Admin-only: hide the area's existence from everyone else.
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  // Drafts/archived are invisible to the anon/authed keys (RLS), so read the
  // full list with the service-role client.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("newsroom_articles")
    .select(
      "id, slug, title, category, status, version, featured, updated_at, published_at"
    )
    .order("updated_at", { ascending: false });

  const articles = (data ?? []) as Pick<
    NewsroomArticle,
    | "id"
    | "slug"
    | "title"
    | "category"
    | "status"
    | "version"
    | "featured"
    | "updated_at"
    | "published_at"
  >[];

  const counts = articles.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className={ADMIN_EYEBROW}>
              <Newspaper className="size-3.5" />
              Admin
            </span>
            <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              Newsroom
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
              {articles.length === 0
                ? "Publish announcements, product updates and notices."
                : `${counts.published ?? 0} published · ${counts.draft ?? 0} draft · ${counts.archived ?? 0} archived`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/newsroom" target="_blank" className={ADMIN_BTN}>
              View public <ExternalLink className="size-3.5" />
            </Link>
            <Link href="/admin/newsroom/new" className={ADMIN_BTN_PRIMARY}>
              <Plus className="size-4" /> New article
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="mt-8">
          {articles.length === 0 ? (
            <AdminEmpty
              icon={Newspaper}
              title="No articles yet"
              body="Create your first story to start the Newsroom."
            >
              <Link
                href="/admin/newsroom/new"
                className={` mt-5`}
              >
                <Plus className="size-4" /> New article
              </Link>
            </AdminEmpty>
          ) : (
            <AdminArticleList articles={articles} />
          )}
        </div>
      </div>
    </main>
  );
}
