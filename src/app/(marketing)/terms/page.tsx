import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Use"
      updated="June 2026"
      intro="These Terms of Use govern your access to and use of Atlas. By using Atlas, you agree to these terms. Please read them carefully."
      sections={[
        {
          heading: "Acceptance of Terms",
          body: [
            "By creating an account or otherwise using Atlas, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, you may not use the service.",
            "If you are using Atlas on behalf of an institution, you represent that you have authority to accept these terms.",
          ],
        },
        {
          heading: "Description of Service",
          body: [
            "Atlas turns lecture recordings and uploads into structured study notes, summaries, and transcripts, and lets you edit, organize, and export them.",
            "The service is offered for personal, educational use and is under active development; features may change over time.",
          ],
        },
        {
          heading: "User Accounts",
          body: [
            "You need an account to use Atlas. You are responsible for keeping your login credentials secure and for all activity that occurs under your account.",
            "You agree to provide accurate information and to notify us promptly of any unauthorized use of your account.",
          ],
        },
        {
          heading: "Acceptable Use",
          body: [
            "You agree not to use Atlas to record people without the consent required by law, to infringe others’ rights, to upload unlawful content, or to attempt to disrupt, reverse-engineer, or gain unauthorized access to the service.",
            "You must follow your institution’s policies and applicable laws regarding the recording of lectures — some instructors and venues require prior consent.",
            "You agree not to abuse the service — including automated or excessive use, attempts to circumvent usage limits, uploading content you do not have rights to process, sharing accounts to evade restrictions, or any activity that imposes unreasonable load on Atlas or our providers.",
          ],
        },
        {
          heading: "Account Suspension & Access Restrictions",
          body: [
            "We may suspend, restrict, or terminate your account if we detect unusual activity, suspected abuse, violations of these terms, or conduct that risks the security, reliability, or cost of the service.",
            "Suspension may be applied automatically by our systems when protective limits are triggered. If your account is restricted, you may be unable to sign in or continue using Atlas until the restriction is lifted.",
            "When processing is paused or an account is restricted, certain data associated with your account — including recordings, uploads, transcripts, and notes — may be retained for a limited period and may be deleted thereafter. Retention is not guaranteed.",
            "If you believe a restriction was applied in error, contact us at hello@atlasai.ca.",
          ],
        },
        {
          heading: "Intellectual Property",
          body: [
            "Atlas, including its software, design, and branding, is owned by Atlas Co. and protected by intellectual property laws. These terms do not grant you any right to our trademarks or other brand features.",
          ],
        },
        {
          heading: "User Content",
          body: [
            "You retain ownership of the audio you provide and the notes generated for you. You grant Atlas the limited permissions needed to process, store, and display your content in order to provide the service to you.",
            "You are responsible for ensuring you have the rights to any content you record or upload.",
          ],
        },
        {
          heading: "Termination",
          body: [
            "You may stop using Atlas and delete your account at any time. We may suspend or terminate access if you violate these terms or if necessary to protect the service or other users.",
            "Upon termination, your right to use the service ends, and we may delete your associated content as described in our Privacy Policy.",
          ],
        },
        {
          heading: "Disclaimers & Limitations of Liability",
          body: [
            "Atlas is provided on an “as is” and “as available” basis without warranties of any kind. We do not guarantee that notes will be complete or error-free, or that the service will be uninterrupted.",
            "To the fullest extent permitted by law, Atlas Co. will not be liable for any indirect, incidental, or consequential damages arising from your use of the service.",
          ],
        },
        {
          heading: "Governing Law",
          body: [
            "These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict-of-law principles. You agree to the exclusive jurisdiction of the courts located in Ontario, Canada.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about these terms? Contact us at hello@atlasai.ca.",
          ],
        },
      ]}
    />
  );
}
