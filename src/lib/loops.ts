import "server-only";

const LOOPS_TRANSACTIONAL_URL = "https://app.loops.so/api/v1/transactional";

export const LOOPS_MAGIC_LINK_TRANSACTIONAL_ID = "cmq1mg8g10qt80j4lpcu96ceh";
export const LOOPS_WELCOME_TRANSACTIONAL_ID = "cmq1itd6x0fza0j0t5agacenh";

interface SendLoopsEmailInput {
  transactionalId: string;
  email: string;
  dataVariables?: Record<string, string | number>;
  idempotencyKey?: string;
  addToAudience?: boolean;
}

export async function sendLoopsEmail({
  transactionalId,
  email,
  dataVariables,
  idempotencyKey,
  addToAudience = true,
}: SendLoopsEmailInput) {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing LOOPS_API_KEY.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(LOOPS_TRANSACTIONAL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      transactionalId,
      addToAudience,
      ...(dataVariables ? { dataVariables } : {}),
    }),
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // The status line is enough when Loops does not return JSON.
    }
    throw new Error(`Loops email failed: ${message}`);
  }

  return true;
}
