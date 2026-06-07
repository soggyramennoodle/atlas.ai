/**
 * Pure classification of Gemini API errors. No `server-only`, no SDK import, so
 * it stays unit-testable and importable from the worker. Distinguishes the
 * monthly billing/spend cap (which won't recover until the cap is raised) from
 * an ordinary rate/quota burst (which the worker may keep retrying).
 */
export class GeminiSpendCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiSpendCapError";
  }
}

export type GeminiErrorKind = "spend_cap" | "rate_limit" | "other";

/** Pull code/status/message out of the various shapes the SDK throws. */
function readError(err: unknown): { code?: number; status?: string; message: string } {
  if (err == null) return { message: "" };
  if (typeof err === "string") return { message: err };
  const anyErr = err as Record<string, unknown>;
  const nested = (anyErr.error as Record<string, unknown> | undefined) ?? anyErr;
  const code = Number(nested.code ?? anyErr.code);
  const status = String(nested.status ?? anyErr.status ?? "");
  const message = String(nested.message ?? anyErr.message ?? (err as Error)?.message ?? "");
  return {
    code: Number.isFinite(code) ? code : undefined,
    status: status || undefined,
    message,
  };
}

const CAP_SIGNAL = /spend|billing|quota|cap/i;

export function classifyGeminiError(err: unknown): GeminiErrorKind {
  const { code, status, message } = readError(err);
  const exhausted = status === "RESOURCE_EXHAUSTED" || code === 429 || /RESOURCE_EXHAUSTED|\b429\b/.test(message);
  if (!exhausted) return "other";
  return CAP_SIGNAL.test(message) ? "spend_cap" : "rate_limit";
}
