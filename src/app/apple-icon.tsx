import { createAppleIconImage } from "@/lib/atlas-social-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return createAppleIconImage(size.width);
}
