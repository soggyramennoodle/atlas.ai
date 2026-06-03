import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * LOCAL-ONLY dev login (§dev §). Lets local tooling reach auth-locked pages
 * without a real password by minting a session for a throwaway dev user.
 *
 * Safety:
 * - Returns 404 in any production build (`NODE_ENV === "production"`).
 * - Additionally inert unless `ATLAS_DEV_LOGIN=1` is set (keep it out of any
 *   committed env file — set it only in your local `.env.local`).
 * - Needs the service role key, which only exists locally.
 *
 * Usage: open `http://localhost:3000/api/dev/login` (optionally
 * `?next=/notes/<id>` or `?email=you@example.com`).
 */
export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ATLAS_DEV_LOGIN !== "1"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const email =
    searchParams.get("email") ?? process.env.DEV_LOGIN_EMAIL ?? "dev@atlas.local";

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure the dev user exists. Ignore the "already registered" error so this
  // is idempotent across runs.
  await admin.auth.admin.createUser({ email, email_confirm: true });

  // Mint a magic-link token, then verify it through the cookie-bound SSR client
  // so the session lands directly in this browser's cookies — no PKCE verifier
  // and no client-side hash handling required.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return NextResponse.json(
      { error: error?.message ?? "Couldn't generate a login link." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
