import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { LogoutAllButton } from "@/components/admin/logout-all-button";
import { SiteAnnouncementForm } from "@/components/admin/site-announcement-form";
import { getAdminAnnouncement } from "@/lib/site-announcement";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { Globe2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-kit";

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
        <AdminHeader
          icon={Globe2}
          title={
            <>
              Site <span className="font-instrument italic">controls</span>
            </>
          }
          description="Broadcast status to visitors and manage global sessions."
        />

        <SiteAnnouncementForm initial={announcement} />
        <LogoutAllButton />
      </div>
    </main>
  );
}
