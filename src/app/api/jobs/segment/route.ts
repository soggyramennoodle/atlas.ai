import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Body {
  jobId?: string;
  segmentIndex?: number;
  r2Key?: string;
  durationSeconds?: number | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const { jobId, segmentIndex, r2Key } = body;
  if (!jobId || !Number.isInteger(segmentIndex) || !r2Key) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  // Ownership: the key must be under the user's folder.
  if (!r2Key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { data: job } = await supabase
    .from("lecture_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Unknown job." }, { status: 404 });

  const { error } = await supabase.from("lecture_segments").upsert(
    {
      job_id: jobId,
      index: segmentIndex,
      r2_key: r2Key,
      status: "uploaded",
      duration_seconds: body.durationSeconds ?? null,
    },
    { onConflict: "job_id,index" }
  );
  if (error) {
    return NextResponse.json({ error: "Could not register segment." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
