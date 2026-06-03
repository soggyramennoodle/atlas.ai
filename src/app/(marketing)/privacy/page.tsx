import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 2026"
      intro="Atlas is built around a simple promise: your lectures are private, always. This policy explains what we collect, how it's used, and the control you have over it."
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account information: the email address you sign in with, and the profile details you choose to provide during onboarding (name, institution, program, year, and expected graduation).",
            "Lecture content: the audio you record or upload, and the structured notes, summaries, and transcripts generated from it.",
            "Usage signals: the edits you make to your notes, which Atlas uses to personalize future note-taking for you.",
          ],
        },
        {
          heading: "How your audio is handled",
          body: [
            "Your lecture audio is uploaded to private storage scoped to your account and sent to our notes engine for transcription and analysis. Once your notes are generated, the audio is deleted from the processing service.",
            "Your recordings and notes are protected by row-level security so that only your account can ever access them.",
          ],
        },
        {
          heading: "How we use your data",
          body: [
            "We use your content solely to generate and improve your notes and to personalize your experience. Your data is never sold or shared with advertisers, and it is never used to train third-party models.",
          ],
        },
        {
          heading: "Your controls",
          body: [
            "You can edit or delete any note at any time. Deleting a note also removes its stored audio. You can update or clear your profile information from Settings.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about your privacy? Reach out through the support channel listed in your account. We'll respond promptly.",
          ],
        },
      ]}
    />
  );
}
