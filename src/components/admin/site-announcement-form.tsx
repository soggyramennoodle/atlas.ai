"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <h2 className="font-medium">Landing status pill</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Shown above the hero on the marketing page. Use it for beta notices,
        downtime, or anything everyone should see.
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="announcement-message">Message</Label>
          <Input
            id="announcement-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Atlas is now in beta! Get started now."
            maxLength={240}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded-[3px] border border-border"
          />
          Show on landing page
        </label>

        <Button onClick={save} disabled={pending || !message.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save status
        </Button>
      </div>
    </div>
  );
}
