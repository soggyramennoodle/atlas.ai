import "server-only";
import { sendLoopsEmail } from "@/lib/loops";

const ADMIN_TEMPLATE = process.env.LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID;
const BACK_ONLINE_TEMPLATE = process.env.LOOPS_BACK_ONLINE_TRANSACTIONAL_ID;

/** Comma/space separated admin recipients (reuses the newsroom admin list). */
function adminEmails(): string[] {
  return (process.env.NEWSROOM_ADMIN_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Email every operator once per incident. Never throws. */
export async function sendSpendCapAdminAlert(alertId: string): Promise<void> {
  if (!ADMIN_TEMPLATE) {
    console.warn("LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID not set; skipping admin alert.");
    return;
  }
  for (const email of adminEmails()) {
    try {
      await sendLoopsEmail({
        transactionalId: ADMIN_TEMPLATE,
        email,
        addToAudience: false,
        dataVariables: { detectedAt: new Date().toISOString() },
        idempotencyKey: `spend-cap-admin-${alertId}-${email}`,
      });
    } catch (err) {
      console.error(`Spend-cap admin alert to ${email} failed:`, err);
    }
  }
}

/** Email one affected user that processing is restored. Never throws. */
export async function sendBackOnlineEmail(email: string, alertId: string): Promise<void> {
  if (!BACK_ONLINE_TEMPLATE) {
    console.warn("LOOPS_BACK_ONLINE_TRANSACTIONAL_ID not set; skipping back-online email.");
    return;
  }
  try {
    await sendLoopsEmail({
      transactionalId: BACK_ONLINE_TEMPLATE,
      email,
      addToAudience: false,
      idempotencyKey: `back-online-${alertId}-${email}`,
    });
  } catch (err) {
    console.error(`Back-online email to ${email} failed:`, err);
  }
}
