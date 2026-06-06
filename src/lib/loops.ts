import "server-only";
import { firstNameFrom } from "@/lib/name";

const LOOPS_TRANSACTIONAL_URL = "https://app.loops.so/api/v1/transactional";

interface SendWelcomeEmailInput {
  email: string;
  displayName?: string | null;
  userId: string;
}

export async function sendWelcomeEmail({
  email,
  displayName,
  userId,
}: SendWelcomeEmailInput) {
  const apiKey = process.env.LOOPS_API_KEY;
  const transactionalId = process.env.LOOPS_WELCOME_TRANSACTIONAL_ID;

  if (!apiKey || !transactionalId) {
    console.warn(
      "Skipping Loops welcome email: LOOPS_API_KEY or LOOPS_WELCOME_TRANSACTIONAL_ID is missing."
    );
    return false;
  }

  const res = await fetch(LOOPS_TRANSACTIONAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `atlas-welcome-${userId}`,
    },
    body: JSON.stringify({
      email,
      transactionalId,
      addToAudience: true,
      dataVariables: {
        first_name: firstNameFrom(displayName) || firstNameFrom(email),
      },
    }),
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep the HTTP status as the useful failure detail.
    }
    throw new Error(`Loops welcome email failed: ${message}`);
  }

  return true;
}
