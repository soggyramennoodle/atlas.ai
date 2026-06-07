import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flag } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { FeedbackInbox } from "@/components/admin/feedback-inbox";
import { listAdminFeedback } from "@/lib/admin-feedback-server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";

export const metadata: Metadata = { title: "Feedback · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const rows = await listAdminFeedback();

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-4xl">
        <AdminBackLink fallbackHref="/admin" label="Back" />

        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Flag className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            User reports
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Reports from note pages and the sidebar feedback button. Mark items
            read when triaged, resolve when addressed, and leave internal notes
            for your team.
          </p>
        </div>

        <div className="mt-8">
          <FeedbackInbox rows={rows} />
        </div>
      </div>
    </main>
  );
}
