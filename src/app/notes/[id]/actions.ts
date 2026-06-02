"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "lectures";

/** Deletes a note (and its audio) owned by the current user. */
export async function deleteNote(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch first so we can clean up the stored audio. RLS scopes this to owner.
  const { data: note } = await supabase
    .from("notes")
    .select("audio_path")
    .eq("id", id)
    .single();

  if (note?.audio_path) {
    await supabase.storage.from(BUCKET).remove([note.audio_path]);
  }

  await supabase.from("notes").delete().eq("id", id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
