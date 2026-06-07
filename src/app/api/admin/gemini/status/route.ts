import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { getActiveAlert, distinctUserIds } from "@/lib/alerts";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const alert = await getActiveAlert("GEMINI_SPEND_CAP");
  if (!alert) {
    return NextResponse.json({ active: false, since: null, affectedJobs: 0, affectedUsers: 0 });
  }

  const db = createAdminClient();
  const { data: jobs } = await db
    .from("lecture_jobs")
    .select("user_id")
    .eq("error", "gemini_spend_cap")
    .neq("status", "ready");
  const heldJobs = (jobs ?? []) as { user_id: string }[];

  return NextResponse.json({
    active: true,
    since: alert.first_detected_at,
    affectedJobs: heldJobs.length,
    affectedUsers: distinctUserIds(heldJobs).length,
  });
}
