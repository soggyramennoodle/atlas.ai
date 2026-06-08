import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { LogoutAllButton } from "@/components/admin/logout-all-button";
import { SiteAnnouncementForm } from "@/components/admin/site-announcement-form";
import { getAdminAnnouncement } from "@/lib/site-announcement";
import { getNewsroomAdmin } from "@/lib/newsroom-server";

export const metadata: Metadata = { title: "Site" };
export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const announcement = await getAdminAnnouncement();

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <AdminBackLink fallbackHref="/admin" label="Admin" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site controls</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Broadcast status to visitors and manage global sessions.
          </p>
        </div>

        <SiteAnnouncementForm initial={announcement} />
        <LogoutAllButton />
      </div>
    </main>
  );
}
