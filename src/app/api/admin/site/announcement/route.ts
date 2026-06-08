import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { getAdminAnnouncement, upsertAnnouncement } from "@/lib/site-announcement";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getNewsroomAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const announcement = await getAdminAnnouncement();
  return NextResponse.json({ announcement });
}

export async function POST(request: Request) {
  const admin = await getNewsroomAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const enabled = body.enabled !== false;

  try {
    await upsertAnnouncement({
      message,
      enabled,
      updatedBy: admin.id,
    });
  } catch (err) {
    console.error("Announcement save failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the announcement." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
