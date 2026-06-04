import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/newsroom/article-editor";
import { getNewsroomAdmin } from "@/lib/newsroom-server";

export const metadata: Metadata = { title: "New article · Newsroom" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  return <ArticleEditor article={null} />;
}
