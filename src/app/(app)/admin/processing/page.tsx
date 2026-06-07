import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft } from "lucide-react";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
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
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Admin
        </Link>

        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Activity className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Processing
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Live status of recordings and uploads moving through the pipeline.
            No note content or user is shown — only job state.
          </p>
        </div>

        <div className="mt-8">
          <ProcessingMonitor initial={snapshot} />
        </div>
      </div>
    </main>
  );
}
