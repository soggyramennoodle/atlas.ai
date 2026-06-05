import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Newspaper, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminArticleList } from "@/components/newsroom/admin-article-list";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
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
            <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
              <Newspaper className="size-3.5" />
              Admin
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              Newsroom
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {articles.length === 0
                ? "Publish announcements, product updates and notices."
                : `${counts.published ?? 0} published · ${counts.draft ?? 0} draft · ${counts.archived ?? 0} archived`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/newsroom" target="_blank">
                View public <ExternalLink className="size-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/newsroom/new">
                <Plus className="size-4" /> New article
              </Link>
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="mt-8">
          {articles.length === 0 ? (
            <div className="rounded-[4px] border border-dashed bg-card px-6 py-16 text-center shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="mx-auto grid size-12 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
                <Newspaper className="size-5" />
              </div>
              <h2 className="mt-4 font-medium">No articles yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Create your first story to start the Newsroom.
              </p>
              <Button asChild className="mt-5" size="sm">
                <Link href="/admin/newsroom/new">
                  <Plus className="size-4" /> New article
                </Link>
              </Button>
            </div>
          ) : (
            <AdminArticleList articles={articles} />
          )}
        </div>
      </div>
    </main>
  );
}
