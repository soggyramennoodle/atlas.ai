"use client";

import { useMemo, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";
import {
  ADMIN_BTN,
  ADMIN_BTN_PRIMARY,
  ADMIN_INPUT,
  CARD,
  cn,
} from "@/components/admin/admin-kit";
import { buildSignatureHtml, type SignatureFields } from "@/lib/email-signature";

type Field = {
  key: keyof SignatureFields;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
};

const FIELDS: Field[] = [
  { key: "fullName", label: "Full name", placeholder: "Adeeb Rahman", required: true },
  { key: "jobTitle", label: "Job title", placeholder: "Founder", required: true },
  { key: "email", label: "Email", placeholder: "adeeb@atlasai.ca", type: "email", required: true },
  { key: "phone", label: "Phone (optional)", placeholder: "+1 905 555 0199", type: "tel" },
  { key: "pronouns", label: "Pronouns (optional)", placeholder: "he/him" },
  { key: "ctaLabel", label: "Call-to-action label (optional)", placeholder: "Book a demo" },
  { key: "ctaUrl", label: "Call-to-action link (optional)", placeholder: "https://atlasai.ca/demo", type: "url" },
];

const EMPTY: SignatureFields = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  pronouns: "",
  ctaLabel: "",
  ctaUrl: "",
};

type CopyState = "idle" | "rich" | "source" | "error";

export function SignatureGenerator() {
  const [fields, setFields] = useState<SignatureFields>(EMPTY);
  const [copied, setCopied] = useState<CopyState>("idle");

  const html = useMemo(() => buildSignatureHtml(fields), [fields]);
  const ready = Boolean(
    fields.fullName.trim() && fields.jobTitle.trim() && fields.email.trim()
  );

  function flash(state: CopyState) {
    setCopied(state);
    window.setTimeout(() => setCopied("idle"), 1600);
  }

  async function copySignature() {
    const plain = `${fields.fullName} — ${fields.jobTitle}, Atlas\n${fields.email}`;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        // Fallback: select a rendered node and use execCommand.
        const node = document.createElement("div");
        node.setAttribute("contenteditable", "true");
        node.style.position = "fixed";
        node.style.opacity = "0";
        node.innerHTML = html;
        document.body.appendChild(node);
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand("copy");
        sel?.removeAllRanges();
        node.remove();
      }
      flash("rich");
    } catch {
      flash("error");
    }
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(html);
      flash("source");
    } catch {
      flash("error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      {/* Form */}
      <div className={cn(CARD, "p-6 sm:p-7")}>
        <h2 className="font-medium text-white">Your details</h2>
        <p className="mt-1 text-sm leading-6 text-white/70">
          Required fields fill the preview. Optional ones are left out when blank.
        </p>

        <div className="mt-5 space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <label
                htmlFor={`sig-${field.key}`}
                className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50"
              >
                {field.label}
              </label>
              <input
                id={`sig-${field.key}`}
                type={field.type ?? "text"}
                value={(fields[field.key] ?? "") as string}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className={ADMIN_INPUT}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview + copy */}
      <div className="space-y-4 lg:sticky lg:top-8">
        <div className={cn(CARD, "p-6 sm:p-7")}>
          <h2 className="font-medium text-white">Preview</h2>
          <p className="mt-1 text-sm leading-6 text-white/70">
            Exactly what lands in the recipient&rsquo;s inbox.
          </p>

          <div className="mt-5 rounded-2xl border border-black/[0.1] bg-white p-6">
            {ready ? (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-sm text-[#0d0d0d]/40">
                Fill in name, title, and email to see your signature.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${ADMIN_BTN_PRIMARY} h-10`}
              onClick={copySignature}
              disabled={!ready}
            >
              {copied === "rich" ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied === "rich" ? "Copied" : "Copy signature"}
            </button>
            <button
              type="button"
              className={`${ADMIN_BTN} h-10`}
              onClick={copySource}
              disabled={!ready}
            >
              {copied === "source" ? (
                <Check className="size-4" />
              ) : (
                <Code2 className="size-4" />
              )}
              {copied === "source" ? "Copied" : "Copy HTML source"}
            </button>
            {copied === "error" && (
              <span className="text-xs text-red-300">Copy failed — try again.</span>
            )}
          </div>

          <p className="mt-4 text-xs leading-5 text-white/55">
            Paste into Gmail, Outlook, or Apple Mail&rsquo;s signature settings. The
            font shows as Inter where available and a matching system sans
            elsewhere.
          </p>
        </div>
      </div>
    </div>
  );
}
