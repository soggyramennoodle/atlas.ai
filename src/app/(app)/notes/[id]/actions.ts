"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "lectures";

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

/**
 * Deletes a note (and its audio) owned by the current user.
 *
 * Returns a plain result instead of calling `redirect()`. Previously this
 * action redirected at the end, but `redirect()` throws a `NEXT_REDIRECT`
 * error which the client's try/catch treated as a failure — producing a false
 * "Couldn't delete" toast even though the delete succeeded (§12). The client
 * now handles the success toast and navigation itself.
 */
export async function deleteNote(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Fetch first so we can clean up the stored audio. RLS scopes this to owner.
  const { data: note } = await supabase
    .from("notes")
    .select("audio_path")
    .eq("id", id)
    .single();

  if (note?.audio_path) {
    await supabase.storage.from(BUCKET).remove([note.audio_path]);
  }

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
