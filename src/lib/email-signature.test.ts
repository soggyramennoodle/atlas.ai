import { describe, expect, it } from "vitest";
import { buildSignatureHtml, type SignatureFields } from "./email-signature";

const base: SignatureFields = {
  fullName: "Adeeb Rahman",
  jobTitle: "Founder",
  email: "adeeb@atlasai.ca",
};

describe("buildSignatureHtml", () => {
  it("renders the required fields", () => {
    const html = buildSignatureHtml(base);
    expect(html).toContain("Adeeb Rahman");
    expect(html).toContain("Founder");
    expect(html).toContain("mailto:adeeb@atlasai.ca");
    expect(html).toContain("adeeb@atlasai.ca");
  });

  it("includes the absolute Atlas logo URL", () => {
    const html = buildSignatureHtml(base);
    expect(html).toContain(
      "https://atlasai.ca/brand/atlas-lockup-3d.png"
    );
  });

  it("uses a table layout with an Inter-leading font stack and no green", () => {
    const html = buildSignatureHtml(base);
    expect(html).toContain("<table");
    expect(html.toLowerCase()).toContain("font-family:'inter'");
    expect(html).not.toContain("#0a5736");
  });

  it("omits the phone when not supplied and renders a tel link when supplied", () => {
    expect(buildSignatureHtml(base)).not.toContain("tel:");
    const withPhone = buildSignatureHtml({ ...base, phone: "+1 905 555 0199" });
    expect(withPhone).toContain("tel:+19055550199");
    expect(withPhone).toContain("+1 905 555 0199");
  });

  it("omits pronouns when not supplied and renders them when supplied", () => {
    expect(buildSignatureHtml(base)).not.toContain("he/him");
    expect(buildSignatureHtml({ ...base, pronouns: "he/him" })).toContain(
      "he/him"
    );
  });

  it("never produces a dangling separator when middle contact pieces are absent", () => {
    const html = buildSignatureHtml(base); // website + email, no phone
    expect(html).not.toContain("·  ·");
    expect(html).not.toMatch(/·\s*<\/td>/);
  });

  it("renders the CTA only when both label and url are present", () => {
    expect(buildSignatureHtml({ ...base, ctaLabel: "Book a demo" })).not.toContain(
      "Book a demo"
    );
    expect(
      buildSignatureHtml({ ...base, ctaUrl: "https://atlasai.ca/demo" })
    ).not.toContain("href=\"https://atlasai.ca/demo\"");
    const full = buildSignatureHtml({
      ...base,
      ctaLabel: "Book a demo",
      ctaUrl: "https://atlasai.ca/demo",
    });
    expect(full).toContain("Book a demo");
    expect(full).toContain("https://atlasai.ca/demo");
  });

  it("escapes HTML-special characters in values", () => {
    const html = buildSignatureHtml({
      ...base,
      fullName: 'A & B <script>"x"',
    });
    expect(html).toContain("A &amp; B &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("escapes the email so a crafted address cannot break the mailto attribute", () => {
    const html = buildSignatureHtml({
      ...base,
      email: 'x"@a.com',
    });
    expect(html).not.toContain('mailto:x"@a.com"');
    expect(html).toContain("&quot;");
  });

  it("trims whitespace-only optional fields as absent", () => {
    const html = buildSignatureHtml({ ...base, phone: "   ", pronouns: "  " });
    expect(html).not.toContain("tel:");
  });
});
