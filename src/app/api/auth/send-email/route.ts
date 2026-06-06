import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import {
  LOOPS_MAGIC_LINK_TRANSACTIONAL_ID,
  sendLoopsEmail,
} from "@/lib/loops";

export const runtime = "nodejs";

type EmailActionType =
  | "signup"
  | "magiclink"
  | "recovery"
  | "invite"
  | "email_change"
  | "reauthentication";

interface SupabaseSendEmailHookPayload {
  user: {
    id: string;
    email?: string;
    new_email?: string;
  };
  email_data: {
    token_hash: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
  };
}

function verifyHook(payload: string, headers: Headers) {
  const secret = process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET;
  if (!secret) throw new Error("Missing SUPABASE_SEND_EMAIL_HOOK_SECRET.");

  const webhook = new Webhook(secret.replace("v1,whsec_", ""));
  return webhook.verify(payload, Object.fromEntries(headers)) as SupabaseSendEmailHookPayload;
}

function actionTypeForVerify(type: EmailActionType) {
  return type === "magiclink" ? "magiclink" : type;
}

function confirmationUrl(payload: SupabaseSendEmailHookPayload) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");

  const { email_data } = payload;
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", email_data.token_hash);
  url.searchParams.set("type", actionTypeForVerify(email_data.email_action_type));
  url.searchParams.set("redirect_to", email_data.redirect_to);
  return url.toString();
}

function idempotencyKey(payload: SupabaseSendEmailHookPayload) {
  return `auth-${payload.email_data.email_action_type}-${payload.email_data.token_hash.slice(0, 48)}`;
}

export async function POST(request: Request) {
  const rawPayload = await request.text();

  let payload: SupabaseSendEmailHookPayload;
  try {
    payload = verifyHook(rawPayload, request.headers);
  } catch (err) {
    console.error("Supabase send-email hook verification failed:", err);
    return NextResponse.json(
      { error: { message: "Invalid hook signature." } },
      { status: 401 }
    );
  }

  const email = payload.user.email;
  if (!email) {
    return NextResponse.json(
      { error: { message: "Missing recipient email." } },
      { status: 400 }
    );
  }

  try {
    await sendLoopsEmail({
      transactionalId: LOOPS_MAGIC_LINK_TRANSACTIONAL_ID,
      email,
      dataVariables: {
        confirmationURL: confirmationUrl(payload),
      },
      idempotencyKey: idempotencyKey(payload),
    });
  } catch (err) {
    console.error("Loops auth email failed:", err);
    return NextResponse.json(
      { error: { message: "Couldn't send auth email." } },
      { status: 500 }
    );
  }

  return NextResponse.json({});
}
