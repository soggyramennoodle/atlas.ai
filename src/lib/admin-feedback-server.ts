import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminFeedbackRow, FeedbackStatus } from "@/lib/types";

type FeedbackQueryRow = {
  id: string;
  user_id: string;
  note_id: string | null;
  category: AdminFeedbackRow["category"];
  message: string | null;
  page_path: string | null;
  status: FeedbackStatus;
  reporter_email: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  notes: { title: string } | { title: string }[] | null;
};

function noteTitle(notes: FeedbackQueryRow["notes"]) {
  if (!notes) return null;
  if (Array.isArray(notes)) return notes[0]?.title ?? null;
  return notes.title ?? null;
}

export async function listAdminFeedback(limit = 200): Promise<AdminFeedbackRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("user_feedback")
    .select(
      "id, user_id, note_id, category, message, page_path, status, reporter_email, admin_notes, reviewed_at, created_at, notes(title)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Admin feedback list failed:", error);
    return [];
  }

  return ((data ?? []) as FeedbackQueryRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    note_id: row.note_id,
    category: row.category,
    message: row.message,
    page_path: row.page_path,
    status: row.status ?? "unread",
    reporter_email: row.reporter_email,
    admin_notes: row.admin_notes,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    note_title: noteTitle(row.notes),
  }));
}

export async function countUnreadFeedback(): Promise<number> {
  const db = createAdminClient();
  const { count, error } = await db
    .from("user_feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");

  if (error) {
    console.error("Unread feedback count failed:", error);
    return 0;
  }

  return count ?? 0;
}
