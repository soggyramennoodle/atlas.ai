import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flag } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { FeedbackInbox } from "@/components/admin/feedback-inbox";
import { listAdminFeedback } from "@/lib/admin-feedback-server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { ADMIN_EYEBROW } from "@/components/admin/admin-kit";

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
          <span className={ADMIN_EYEBROW}>
            <Flag className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
            User <span className="font-instrument italic">reports</span>
          </h1>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
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
