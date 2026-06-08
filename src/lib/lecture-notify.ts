import "server-only";
import { ATLAS_SITE_URL } from "@/lib/atlas-brand";
import { sendLoopsEmail } from "@/lib/loops";

const LECTURE_READY_TEMPLATE = process.env.LOOPS_LECTURE_READY_TRANSACTIONAL_ID;

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
  if (!LECTURE_READY_TEMPLATE) {
    console.warn(
      "LOOPS_LECTURE_READY_TRANSACTIONAL_ID not set; skipping lecture-ready email."
    );
    return false;
  }

  try {
    await sendLoopsEmail({
      transactionalId: LECTURE_READY_TEMPLATE,
      email,
      addToAudience: false,
      dataVariables: {
        lectureTitle: input.title,
        noteUrl: `${ATLAS_SITE_URL}/notes/${input.noteId}`,
      },
      idempotencyKey: `lecture-ready-${input.jobId}`,
    });
    return true;
  } catch (err) {
    console.error(`Lecture-ready email to ${email} failed:`, err);
    return false;
  }
}
