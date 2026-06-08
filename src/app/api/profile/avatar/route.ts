import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import {
  AVATAR_MAX_BYTES,
  buildAvatarR2Key,
  isAvatarR2KeyForUser,
  mimeForAvatarKey,
} from "@/lib/profile-avatar";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getOwnedAvatarKey(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("avatar_r2_key")
    .eq("user_id", userId)
    .maybeSingle();

  const key = data?.avatar_r2_key;
  if (!key || !isAvatarR2KeyForUser(key, userId)) return null;
  return key;
}

async function deleteAvatarObject(key: string | null) {
  if (!key) return;
  await r2
    .send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }))
    .catch(() => {});
}

/** Serve the signed-in user's profile picture from R2. */
export async function GET() {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const key = await getOwnedAvatarKey(user.id);
  if (!key) {
    return NextResponse.json({ error: "No profile picture." }, { status: 404 });
  }

  try {
    const { Body } = await r2.send(
      new GetObjectCommand({ Bucket: getR2Bucket(), Key: key })
    );
    if (!Body) {
      return NextResponse.json({ error: "Profile picture missing." }, { status: 404 });
    }

    const data = Buffer.from(await Body.transformToByteArray());
    return new Response(data, {
      headers: {
        "Content-Type": mimeForAvatarKey(key),
        "Cache-Control": "private, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Profile picture missing." }, { status: 404 });
  }
}

/** Upload or replace the signed-in user's profile picture in R2. */
export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!contentType?.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }

  const key = buildAvatarR2Key(user.id, contentType);
  if (!key) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or GIF image." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty image." }, { status: 400 });
  }
  if (bytes.length > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { error: "Profile pictures must be under 2 MB." },
      { status: 413 }
    );
  }

  const previousKey = await getOwnedAvatarKey(user.id);

  await r2.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );

  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { user_id: user.id, avatar_r2_key: key },
      { onConflict: "user_id" }
    );

  if (error) {
    await deleteAvatarObject(key);
    console.error("Avatar profile update failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your profile picture." },
      { status: 500 }
    );
  }

  if (previousKey && previousKey !== key) {
    await deleteAvatarObject(previousKey);
  }

  return NextResponse.json({ ok: true, avatarR2Key: key });
}

/** Remove the signed-in user's profile picture. */
export async function DELETE() {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const key = await getOwnedAvatarKey(user.id);
  await deleteAvatarObject(key);

  const { error } = await supabase
    .from("user_profiles")
    .update({ avatar_r2_key: null })
    .eq("user_id", user.id);

  if (error) {
    console.error("Avatar clear failed:", error);
    return NextResponse.json(
      { error: "Couldn't remove your profile picture." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
