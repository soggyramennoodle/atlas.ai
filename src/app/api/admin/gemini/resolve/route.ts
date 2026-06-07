import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { resolveAlert, distinctUserIds } from "@/lib/alerts";
import { sendBackOnlineEmail } from "@/lib/admin-notify";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function kickTick(request: Request) {
  const secret = [process.env.JOBS_TICK_SECRET, process.env.CRON_SECRET]
    .map((s) => s?.trim())
    .find((s): s is string => !!s);
  if (!secret) return;
  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, { method: "POST", headers: { "x-jobs-secret": secret } }).catch(() => {});
}

export async function POST(request: Request) {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const alert = await resolveAlert("GEMINI_SPEND_CAP");
  if (!alert) return NextResponse.json({ resolved: true, requeued: 0, emailsQueued: 0 });

  const db = createAdminClient();

  // Snapshot held jobs (user ids + note ids) before clearing the tags.
  const { data: jobs } = await db
    .from("lecture_jobs")
    .select("id, user_id, note_id")
    .eq("error", "gemini_spend_cap")
    .neq("status", "ready");
  const heldJobs = (jobs ?? []) as { id: string; user_id: string; note_id: string | null }[];

  // Clear the hold tag → jobs become reclaimable and resume on the next tick.
  if (heldJobs.length > 0) {
    await db
      .from("lecture_jobs")
      .update({ error: null, updated_at: new Date().toISOString() })
      .eq("error", "gemini_spend_cap")
      .neq("status", "ready");

    // Clear the note hold marker so the overlay returns to normal processing.
    for (const job of heldJobs) {
      if (!job.note_id) continue;
      const { data: noteRow } = await db
        .from("notes")
        .select("content")
        .eq("id", job.note_id)
        .maybeSingle();
      const content = (noteRow?.content as Record<string, unknown> | null) ?? {};
      await db
        .from("notes")
        .update({ content: { ...content, status: "processing", hold: null } })
        .eq("id", job.note_id);
    }
  }

  // Email each distinct affected user once.
  const userIds = distinctUserIds(heldJobs);
  let emailsQueued = 0;
  for (const userId of userIds) {
    const { data: userRes } = await db.auth.admin.getUserById(userId);
    const email = userRes?.user?.email;
    if (email && (await sendBackOnlineEmail(email, alert.id))) {
      emailsQueued += 1;
    }
  }

  await kickTick(request);
  return NextResponse.json({ resolved: true, requeued: heldJobs.length, emailsQueued });
}
