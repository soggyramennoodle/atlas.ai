import { NextResponse } from "next/server";
import { runJobCleanup } from "@/lib/jobs-cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

function configuredSecrets() {
  return [process.env.JOBS_TICK_SECRET, process.env.CRON_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);
}

function isAuthorizedCleanup(request: Request) {
  const secrets = configuredSecrets();
  if (secrets.length === 0) return process.env.NODE_ENV !== "production";

  const headerSecret = request.headers.get("x-jobs-secret")?.trim();
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return secrets.some((secret) => secret === headerSecret || secret === bearer);
}

async function runCleanup(request: Request) {
  if (!isAuthorizedCleanup(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await runJobCleanup();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return runCleanup(request);
}

export async function POST(request: Request) {
  return runCleanup(request);
}
