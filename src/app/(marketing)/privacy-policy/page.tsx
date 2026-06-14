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
            "Account information: the email address you sign in with, the method you use to sign in (for example, signing in with Google), and the profile details you choose to provide — your name, institution, program, year, and expected graduation.",
            "Lecture content (physical lectures): the audio you record or upload, and the structured notes, summaries, transcripts, and edits generated from or made to it.",
            "Lecture content (virtual lectures): the screen recording of your chosen tab, window, or entire screen, and the notes, summaries, transcripts, and edits generated from or made to it.",
            "Usage information: basic technical data such as device and browser type, and the interactions needed to operate the service (for example, when a note is created or exported).",
          ],
        },
        {
          heading: "How We Use Your Information",
          body: [
            "We use your information to provide and improve the service: to transcribe and analyze your recordings, generate and store your notes, sync your library across sessions, and personalize future note-taking based on your info.",
            "We do not use your personal notes or recordings to train AI models, and we do not use them for advertising.",
            "When you share your screen for a virtual lecture, neither we nor our AI watch the video. We only capture the audio from the tab, window, or screen you share — that audio is what we need to write your notes. Any screen recording is stored only briefly while your notes are generated, and is then deleted.",
          ],
        },
        {
          heading: "Data Sharing & Third Parties",
          body: [
            "We share data only with the trusted service providers we rely on to run Atlas — for example, the cloud provider that securely stores your notes, and the AI provider that performs transcription and note generation. These providers process your data on our behalf, under confidentiality obligations, and only to help us deliver the service to you.",
            "We never sell your personal information, and we never share it with advertisers or data brokers. We may disclose information if required by law or to protect the rights, safety, and security of our users and the service.",
          ],
        },
        {
          heading: "How We Protect Your Information",
          body: [
            "Your account and content are protected with industry-standard safeguards, including encryption in transit and access controls that limit who can reach your data. Your notes and recordings are tied to your account — other students and the public cannot see them.",
            "No online service can promise perfect security, but we work hard to protect your information and to keep sensitive data, like your recordings, only as long as we genuinely need it.",
          ],
        },
        {
          heading: "Data Retention",
          body: [
            "Your lecture audio is kept only as long as needed to generate your notes, after which it is removed from our processing service and deleted from our servers. Your notes and account information are kept for as long as your account is active.",
            "For virtual lectures, any screen recording is kept only long enough to capture the audio needed to write your notes, and is then deleted from our servers. Our AI only ever receives that audio, never the video of your screen.",
            "When you delete a note, its transcript, summary, and course details are deleted along with it. When you delete your account, we remove your associated content within a reasonable period, except where the law requires us to keep it.",
          ],
        },
        {
          heading: "Payments & Plans",
          body: [
            "Atlas is free to use while it is in beta, and we don't ask for payment information to sign up. If we introduce paid plans in the future, we'll give you clear notice before any charges apply, and payments would be handled by a secure third-party payment processor — we would not store your full card details ourselves.",
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
            "Atlas is intended and built for students in higher education and is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will take necessary measures, as required by law.",
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
            "Questions about your privacy or this policy? Contact us at hello@atlasai.ca and we’ll respond promptly.",
          ],
        },
      ]}
    />
  );
}
