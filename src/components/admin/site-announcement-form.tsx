"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_BTN_PRIMARY,
  ADMIN_INPUT,
  CARD,
  cn,
} from "@/components/admin/admin-kit";
import type { SiteAnnouncement } from "@/lib/types";

export function SiteAnnouncementForm({
  initial,
}: {
  initial: SiteAnnouncement;
}) {
  const [message, setMessage] = useState(initial.message);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await fetch("/api/admin/site/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, enabled }),
      });
      if (res.ok) {
        toast.success("Landing status updated.");
      } else {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(json?.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <div className={cn(CARD, "p-6 sm:p-7")}>
      <h2 className="font-medium text-[#0d0d0d]">Landing status pill</h2>
      <p className="mt-1 text-sm leading-6 text-[#0d0d0d]/60">
        Shown above the hero on the marketing page. Use it for beta notices,
        downtime, or anything everyone should see.
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="announcement-message"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45"
          >
            Message
          </label>
          <input
            id="announcement-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Atlas is now in beta! Get started now."
            maxLength={240}
            className={ADMIN_INPUT}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#0d0d0d]/80">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded-full border border-black/[0.18] accent-[#0d0d0d]"
          />
          Show on landing page
        </label>

        <button
          type="button"
          className={`${ADMIN_BTN_PRIMARY} h-10`}
          onClick={save}
          disabled={pending || !message.trim()}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save status
        </button>
      </div>
    </div>
  );
}
