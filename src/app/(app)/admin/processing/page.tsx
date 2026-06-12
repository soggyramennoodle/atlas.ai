import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { ADMIN_EYEBROW } from "@/components/admin/admin-kit";
import { getProcessingSnapshot } from "@/lib/processing-server";
import { ProcessingMonitor } from "@/components/admin/processing-monitor";

export const metadata: Metadata = { title: "Processing · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProcessingPage() {
  // Admin-only: hide the area's existence from everyone else.
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const snapshot = await getProcessingSnapshot();

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-4xl">
        <AdminBackLink fallbackHref="/admin" label="Back" />

        <div className="mt-4">
          <span className={ADMIN_EYEBROW}>
            <Activity className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
            Processing
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#0d0d0d]/60">
            Live status of recordings and uploads moving through the pipeline.
            Owner email and pipeline state — no lecture content.
          </p>
        </div>

        <div className="mt-8">
          <ProcessingMonitor initial={snapshot} />
        </div>
      </div>
    </main>
  );
}
