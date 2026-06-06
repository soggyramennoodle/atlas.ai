#!/usr/bin/env node
/**
 * One-time R2 bucket CORS setup for browser multipart uploads.
 * Requires CLOUDFLARE_R2_* env vars (reads .env.local if present).
 *
 * Usage: node scripts/configure-r2-cors.mjs
 * Optional: ATLAS_UPLOAD_ORIGINS=https://atlasai.ca,https://www.atlasai.ca,http://localhost:3000
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Missing CLOUDFLARE_R2_* env vars.");
  process.exit(1);
}

const origins = (
  process.env.ATLAS_UPLOAD_ORIGINS ??
  "https://atlasai.ca,https://www.atlasai.ca,http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

try {
  await r2.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["GET", "PUT", "HEAD", "POST"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log("R2 CORS updated for origins:", origins.join(", "));
} catch (err) {
  console.error("Could not set R2 CORS via API (token may lack Admin permissions).");
  console.error(String(err));
  console.error(
    "\nSet CORS manually: Cloudflare dashboard → R2 →",
    bucket,
    "→ Settings → CORS policy → paste:"
  );
  console.error(
    JSON.stringify(
      [
        {
          AllowedOrigins: origins,
          AllowedMethods: ["GET", "PUT", "HEAD", "POST"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
      null,
      2
    )
  );
  process.exit(1);
}
