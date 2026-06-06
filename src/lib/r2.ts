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
  // AWS SDK v3 (>=3.729) defaults to "WHEN_SUPPORTED", which bakes a CRC32 of an
  // EMPTY body into presigned PUT URLs (x-amz-checksum-crc32=AAAAAA==) and signs
  // it. The browser then PUTs the real bytes, R2 recomputes the checksum, it
  // mismatches the signed value, and R2 returns 403. R2 doesn't need these
  // integrity checksums, so only add them when an operation actually requires it.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// Belt-and-suspenders: strip checksum headers R2 still rejects on some SDK paths.
r2.middlewareStack.add(
  (next) => async (args) => {
    const request = args.request as { headers?: Record<string, string> };
    if (request.headers) {
      for (const key of Object.keys(request.headers)) {
        const lower = key.toLowerCase();
        if (
          lower.startsWith("x-amz-checksum-") ||
          lower === "x-amz-sdk-checksum-algorithm"
        ) {
          delete request.headers[key];
        }
      }
    }
    return next(args);
  },
  { step: "build", name: "stripR2ChecksumHeaders" }
);

export function getR2Bucket() {
  return requiredR2Env("CLOUDFLARE_R2_BUCKET_NAME");
}

/** R2 multipart minimum part size (all parts except the last). */
export const R2_MULTIPART_PART_BYTES = 5 * 1024 * 1024;
