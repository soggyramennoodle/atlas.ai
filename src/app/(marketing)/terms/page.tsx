import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Use"
      updated="June 2026"
      intro="These terms govern your use of Atlas. By using Atlas, you agree to use it responsibly and only with content you have the right to record."
      sections={[
        {
          heading: "Using Atlas",
          body: [
            "Atlas turns lecture recordings into structured study notes. You may use it for your own personal, educational purposes.",
            "You are responsible for keeping your account secure and for the activity that happens under it.",
          ],
        },
        {
          heading: "Content you record",
          body: [
            "You must have the right to record and upload any audio you bring to Atlas. Follow your institution's policies and applicable laws on recording lectures — some instructors and venues require consent.",
            "You retain ownership of your content. You grant Atlas only the permissions needed to process it into notes and make it available to you.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Don't use Atlas to record people without the consent required by law, to infringe others' rights, or to attempt to disrupt or reverse-engineer the service.",
          ],
        },
        {
          heading: "Availability",
          body: [
            "Atlas is under active development and provided on an 'as is' basis. Features may change, and we can't guarantee uninterrupted availability.",
          ],
        },
        {
          heading: "Changes to these terms",
          body: [
            "We may update these terms as Atlas evolves. Continued use after an update means you accept the revised terms.",
          ],
        },
      ]}
    />
  );
}
