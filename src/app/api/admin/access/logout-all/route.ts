import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueAccessRevocation } from "@/lib/access-revocations";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { isNewsroomAdmin } from "@/lib/newsroom";

export const runtime = "nodejs";

const CONFIRM_PHRASE = "log out everyone";

/**
 * Queue a global sign-out for every non-admin account. Grace periods respect
 * active recordings, uploads, and processing jobs.
 */
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

  const confirmation =
    typeof body.confirmation === "string" ? body.confirmation.trim().toLowerCase() : "";
  if (confirmation !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Type "${CONFIRM_PHRASE}" to confirm.` },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  let page = 1;
  let queued = 0;
  let skipped = 0;

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("listUsers failed:", error);
      return NextResponse.json(
        { error: "Couldn't list users." },
        { status: 500 }
      );
    }

    const users = data.users ?? [];
    if (users.length === 0) break;

    for (const user of users) {
      if (user.id === admin.id || isNewsroomAdmin(user.email)) {
        skipped += 1;
        continue;
      }
      try {
        await queueAccessRevocation(user.id, "global_logout");
        queued += 1;
      } catch (err) {
        console.error("Failed to queue logout for", user.id, err);
      }
    }

    if (users.length < 200) break;
    page += 1;
  }

  return NextResponse.json({ ok: true, queued, skipped });
}
