import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseThemePreference } from "@/lib/theme";

export const runtime = "nodejs";

/** Read the signed-in user's saved theme preference. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("theme_preference")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Theme preference lookup failed:", error);
    return NextResponse.json(
      { error: "Couldn't load your theme preference." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    theme: parseThemePreference(data?.theme_preference) ?? null,
  });
}

/** Persist the signed-in user's theme preference to their profile. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const theme = parseThemePreference(body.theme);
  if (!theme) {
    return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { user_id: user.id, theme_preference: theme },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Theme preference save failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your theme preference." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, theme });
}
