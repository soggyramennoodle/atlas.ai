import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/newsroom/article-editor";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NewsroomArticle } from "@/lib/newsroom";

export const metadata: Metadata = { title: "Edit article · Newsroom" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("newsroom_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <ArticleEditor article={data as NewsroomArticle} />;
}
