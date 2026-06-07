import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SystemAlert, SystemAlertType } from "@/lib/types";

/** Pure: decide whether the operator email should fire for this open. */
export function shouldNotifyAdmin(input: { created: boolean; notification_sent: boolean }): boolean {
  return input.created || !input.notification_sent;
}

/** Pure: distinct user ids across held jobs. */
export function distinctUserIds(jobs: { user_id: string }[]): string[] {
  return [...new Set(jobs.map((j) => j.user_id))];
}

export async function getActiveAlert(type: SystemAlertType): Promise<SystemAlert | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("system_alerts")
    .select("*")
    .eq("type", type)
    .eq("active", true)
    .maybeSingle();
  return (data as SystemAlert | null) ?? null;
}

/**
 * Open (or refresh) the active alert for a type. Idempotent: the partial unique
 * index guarantees one active row, so a race resolves to a touch of the winner.
 */
export async function openAlert(
  type: SystemAlertType
): Promise<{ alert: SystemAlert; created: boolean }> {
  const db = createAdminClient();
  const existing = await getActiveAlert(type);
  if (existing) {
    await db
      .from("system_alerts")
      .update({ last_detected_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { alert: existing, created: false };
  }
  const { data, error } = await db
    .from("system_alerts")
    .insert({ type })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    // Lost the insert race against another worker — fetch the winner.
    const winner = await getActiveAlert(type);
    if (winner) return { alert: winner, created: false };
    throw error ?? new Error("Failed to open alert.");
  }
  return { alert: data as SystemAlert, created: true };
}

export async function markNotified(id: string): Promise<void> {
  const db = createAdminClient();
  await db.from("system_alerts").update({ notification_sent: true }).eq("id", id);
}

export async function resolveAlert(type: SystemAlertType): Promise<SystemAlert | null> {
  const db = createAdminClient();
  const existing = await getActiveAlert(type);
  if (!existing) return null;
  await db
    .from("system_alerts")
    .update({ active: false, resolved_at: new Date().toISOString() })
    .eq("id", existing.id);
  return existing;
}
