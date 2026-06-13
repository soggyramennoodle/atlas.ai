/**
 * Pure builder for the Atlas email signature.
 *
 * Returns table-based, fully inline-styled HTML — the only markup that survives
 * Gmail / Outlook / Apple Mail, which strip <style>, flexbox, and embedded
 * fonts. Drives both the admin live preview and the clipboard, so what you see
 * is exactly what gets pasted. Monochrome by design (no brand color); hierarchy
 * comes from weight, size, and letter-spacing.
 */

export type SignatureFields = {
  fullName: string;
  jobTitle: string;
  email: string;
  phone?: string;
  pronouns?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

const LOGO_URL = "https://atlasai.ca/brand/atlas-lockup-3d.png";
const SITE_URL = "https://atlasai.ca";
const SITE_LABEL = "atlasai.ca";

// Inter shows for recipients who have it (Atlas team, most modern clients);
// everyone else falls back to a near-identical system sans. Web fonts cannot
// be embedded in a pasted signature, so a font stack is the robust path.
const FONT =
  "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** Escape a value for safe interpolation into HTML text or a quoted attribute. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Treat whitespace-only optional fields as absent. */
function clean(value?: string): string {
  return (value ?? "").trim();
}

/** A bare anchor with no underline and the muted contact color. */
function link(href: string, text: string): string {
  return `<a href="${esc(href)}" style="color:#5a5a5a;text-decoration:none;">${esc(
    text
  )}</a>`;
}

export function buildSignatureHtml(fields: SignatureFields): string {
  const fullName = clean(fields.fullName);
  const jobTitle = clean(fields.jobTitle);
  const email = clean(fields.email);
  const phone = clean(fields.phone);
  const pronouns = clean(fields.pronouns);
  const ctaLabel = clean(fields.ctaLabel);
  const ctaUrl = clean(fields.ctaUrl);

  const pronounsHtml = pronouns
    ? `<span style="color:#8a8a8a;font-weight:400;font-size:12px;padding-left:6px;">${esc(
        pronouns
      )}</span>`
    : "";

  // Contact line: website + email always present; phone only when supplied.
  // Joining only the present pieces avoids dangling " · " separators.
  const contactPieces = [link(SITE_URL, SITE_LABEL), link(`mailto:${email}`, email)];
  if (phone) {
    const telHref = `tel:${phone.replace(/[^\d+]/g, "")}`;
    contactPieces.push(link(telHref, phone));
  }
  const contactHtml = contactPieces.join(
    '<span style="color:#c4c4c4;"> · </span>'
  );

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<div style="${FONT};font-size:12px;padding-top:8px;"><a href="${esc(
          ctaUrl
        )}" style="color:#0d0d0d;font-weight:500;text-decoration:none;">${esc(
          ctaLabel
        )} &rarr;</a></div>`
      : "";

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${FONT};">` +
    `<tr>` +
    `<td style="vertical-align:top;padding-right:18px;">` +
    `<img src="${LOGO_URL}" width="140" height="39" alt="Atlas" style="display:block;border:0;width:140px;height:39px;" />` +
    `</td>` +
    `<td style="vertical-align:top;padding-left:18px;border-left:1px solid #e4e4e4;">` +
    `<div style="${FONT};color:#0d0d0d;font-weight:600;font-size:15px;line-height:1.3;">${esc(
      fullName
    )}${pronounsHtml}</div>` +
    `<div style="${FONT};color:#5a5a5a;font-size:13px;line-height:1.5;padding-top:2px;">${esc(
      jobTitle
    )}<span style="color:#8a8a8a;"> · Atlas</span></div>` +
    `<div style="${FONT};font-size:12px;line-height:1.6;color:#8a8a8a;padding-top:6px;">${contactHtml}</div>` +
    ctaHtml +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}
