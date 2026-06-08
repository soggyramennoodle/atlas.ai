import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { cancelLectureJob } from "@/lib/cancel-job";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const result = await cancelLectureJob(id);
  if (!result.cancelled) {
    return NextResponse.json({ error: "Job not found or already finished." }, { status: 409 });
  }
  return NextResponse.json({ cancelled: true });
}
