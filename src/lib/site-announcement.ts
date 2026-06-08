import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SiteAnnouncement } from "@/lib/types";

const DEFAULT_MESSAGE = "Atlas is now in beta! Get started now.";

export async function getPublicAnnouncement(): Promise<SiteAnnouncement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_announcement")
    .select("id, message, enabled, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data?.enabled) return null;
  return data as SiteAnnouncement;
}

export async function getAdminAnnouncement(): Promise<SiteAnnouncement> {
  const db = createAdminClient();
  const { data } = await db
    .from("site_announcement")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (data) return data as SiteAnnouncement;

  return {
    id: 1,
    message: DEFAULT_MESSAGE,
    enabled: true,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

export async function upsertAnnouncement(input: {
  message: string;
  enabled: boolean;
  updatedBy: string;
}): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("site_announcement").upsert({
    id: 1,
    message: input.message.trim() || DEFAULT_MESSAGE,
    enabled: input.enabled,
    updated_at: new Date().toISOString(),
    updated_by: input.updatedBy,
  });

  if (error) throw error;
}
