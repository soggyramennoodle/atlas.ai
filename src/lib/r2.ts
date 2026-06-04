import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

export function requiredR2Env(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? "missing-account-id"}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "missing-access-key-id",
    secretAccessKey:
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "missing-secret-access-key",
  },
});

export function getR2Bucket() {
  return requiredR2Env("CLOUDFLARE_R2_BUCKET_NAME");
}
