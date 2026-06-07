import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { getProcessingSnapshot } from "@/lib/processing-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live snapshot of in-flight processing jobs for the admin monitor. Admin-only
 * and content-free (job/note ids and pipeline bookkeeping only). Returns 404 —
 * not 403 — to non-admins so the endpoint's existence stays hidden, matching
 * the admin pages.
 */
export async function GET() {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const snapshot = await getProcessingSnapshot();
  return NextResponse.json(snapshot);
}
