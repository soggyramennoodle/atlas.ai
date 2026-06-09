"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import type { FeedbackStatus } from "@/lib/types";

const STATUSES: FeedbackStatus[] = ["unread", "read", "resolved", "dismissed"];

type ActionResult = { ok: boolean; error?: string };

function revalidateFeedback() {
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  // Refresh the app shell sidebar badge after triage.
  revalidatePath("/dashboard", "layout");
}

async function requireAdmin() {
  const admin = await getNewsroomAdmin();
  if (!admin) return { ok: false as const, error: "Forbidden." };
  return { ok: true as const, admin };
}

export async function updateFeedbackStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  if (!STATUSES.includes(status as FeedbackStatus)) {
    return { ok: false, error: "Invalid status." };
  }

  const next = status as FeedbackStatus;
  const reviewed_at = next === "unread" ? null : new Date().toISOString();

  const db = createAdminClient();
  const { error } = await db
    .from("user_feedback")
    .update({ status: next, reviewed_at })
    .eq("id", id);

  if (error) {
    console.error("Feedback status update failed:", error);
    return { ok: false, error: "Couldn't update status." };
  }

  revalidateFeedback();
  return { ok: true };
}

export async function updateFeedbackNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const db = createAdminClient();
  const { error } = await db
    .from("user_feedback")
    .update({ admin_notes: notes.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("Feedback notes update failed:", error);
    return { ok: false, error: "Couldn't save notes." };
  }

  revalidateFeedback();
  return { ok: true };
}

export async function markAllFeedbackRead(): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const db = createAdminClient();
  const { error } = await db
    .from("user_feedback")
    .update({
      status: "read",
      reviewed_at: new Date().toISOString(),
    })
    .eq("status", "unread");

  if (error) {
    console.error("Mark all read failed:", error);
    return { ok: false, error: "Couldn't mark reports as read." };
  }

  revalidateFeedback();
  return { ok: true };
}
