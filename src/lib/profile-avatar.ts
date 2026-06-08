export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EXT_TO_IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function extForImageContentType(contentType: string) {
  const base = contentType.split(";")[0]!.trim().toLowerCase();
  return IMAGE_MIME_TO_EXT[base] ?? null;
}

export function mimeForAvatarKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_IMAGE_MIME[ext] ?? "image/jpeg";
}

export function buildAvatarR2Key(userId: string, contentType: string) {
  const ext = extForImageContentType(contentType);
  if (!ext) return null;
  return `avatars/${userId}/profile.${ext}`;
}

export function isAvatarR2KeyForUser(key: string, userId: string) {
  return key === `avatars/${userId}/profile.jpg`
    || key === `avatars/${userId}/profile.jpeg`
    || key === `avatars/${userId}/profile.png`
    || key === `avatars/${userId}/profile.webp`
    || key === `avatars/${userId}/profile.gif`;
}

/** First letter of the display name for avatar fallbacks. */
export function profileAvatarInitial(displayName: string) {
  const trimmed = displayName.trim();
  return (trimmed[0] ?? "?").toUpperCase();
}

export function profileAvatarUrl(avatarR2Key: string | null | undefined) {
  if (!avatarR2Key) return null;
  return `/api/profile/avatar?k=${encodeURIComponent(avatarR2Key)}`;
}
