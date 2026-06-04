import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 2026"
      intro="This Privacy Policy explains how Atlas Co. (“Atlas,” “we,” “us”) collects, uses, and protects your information when you use our service. We’ve written it to be readable, but it is a legal document — for the human version of our commitments, see our Privacy page."
      sections={[
        {
          heading: "Introduction & Scope",
          body: [
            "This policy applies to the Atlas web application and any related services that link to it. It covers the information we handle when you create an account, record or upload lectures, generate notes, and otherwise interact with Atlas.",
            "By using Atlas, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the service.",
          ],
        },
        {
          heading: "Information We Collect",
          body: [
            "Account information: the email address you sign in with and the profile details you choose to provide (name, institution, program, year, and expected graduation).",
            "Lecture content: the audio you record or upload, and the structured notes, summaries, transcripts, and edits generated from or made to it.",
            "Usage information: basic technical data such as device and browser type, and the interactions needed to operate the service (for example, when a note is created or exported).",
          ],
        },
        {
          heading: "How We Use Your Information",
          body: [
            "We use your information to provide and improve the service: to transcribe and analyze your recordings, generate and store your notes, sync your library across sessions, and personalize future note-taking based on your edits.",
            "We do not use your personal notes or recordings to train third-party AI models, and we do not use them for advertising.",
          ],
        },
        {
          heading: "Data Sharing & Third Parties",
          body: [
            "We share data only with the service providers necessary to operate Atlas, upon their request. For example, our cloud database and storage provider (Supabase) and the AI model provider (Google) that performs transcription and note generation. These providers process data on our behalf under contractual confidentiality obligations, as well as their own privacy policy pertaining to their associated APIs.",
            "We never sell your personal information, and we never share it with advertisers or data brokers. We may disclose information if required by law or to protect the rights, safety, and security of our users and the service.",
          ],
        },
        {
          heading: "Data Retention",
          body: [
            "Your lecture audio is retained only as long as needed to generate your notes, after which it is removed from the processing service. Your notes and account information are retained for as long as your account is active.",
            "When you delete a note, its stored audio is deleted with it. When you delete your account, we remove your associated content within a reasonable period, except where retention is required by law.",
          ],
        },
        {
          heading: "Your Rights",
          body: [
            "You can access and edit your notes and profile at any time from within Atlas. You can correct your profile information in Settings, export your notes as PDF or DOCX, and delete individual notes or your entire account.",
            "Depending on where you live, you may have additional rights to access, correct, port, or erase your personal data. To exercise these rights, contact us using the details below.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "Atlas uses essential cookies and similar technologies to keep you signed in and to operate core features. We do not use advertising or third-party tracking cookies. You can control cookies through your browser settings, though disabling essential cookies may prevent you from signing in.",
          ],
        },
        {
          heading: "Children’s Privacy",
          body: [
            "Atlas is intended for students in higher education and is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.",
          ],
        },
        {
          heading: "Changes to This Policy",
          body: [
            "We may update this policy as Atlas evolves. When we make material changes, we will update the “Last updated” date above and, where appropriate, provide additional notice. Your continued use of Atlas after an update means you accept the revised policy.",
          ],
        },
        {
          heading: "Contact Information",
          body: [
            "Questions about your privacy or this policy? Contact us at rahma8@mcmaster.ca and we’ll respond promptly.",
          ],
        },
      ]}
    />
  );
}
