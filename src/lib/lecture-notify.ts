import "server-only";
import { ATLAS_SITE_URL } from "@/lib/atlas-brand";
import { sendLoopsEmail } from "@/lib/loops";

export const LOOPS_LECTURE_READY_TRANSACTIONAL_ID =
  process.env.LOOPS_LECTURE_READY_TRANSACTIONAL_ID ?? "cmq4jaj9z56dw0j4lmxpsfltz";

export interface LectureReadyEmailInput {
  jobId: string;
  noteId: string;
  title: string;
}

/** Email the student that their lecture finished processing. Never throws. */
export async function sendLectureReadyEmail(
  email: string,
  input: LectureReadyEmailInput
): Promise<boolean> {
  try {
    await sendLoopsEmail({
      transactionalId: LOOPS_LECTURE_READY_TRANSACTIONAL_ID,
      email,
      addToAudience: false,
      dataVariables: {
        lectureTitle: input.title,
        noteURL: `${ATLAS_SITE_URL}/notes/${input.noteId}`,
      },
      idempotencyKey: `lecture-ready-${input.jobId}`,
    });
    return true;
  } catch (err) {
    console.error(`Lecture-ready email to ${email} failed:`, err);
    return false;
  }
}
