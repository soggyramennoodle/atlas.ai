import { Megaphone } from "lucide-react";
import type { SiteAnnouncement } from "@/lib/types";

export function SiteStatusBanner({
  announcement,
}: {
  announcement: SiteAnnouncement | null;
}) {
  if (!announcement) return null;

  return (
    <div className="mb-4 inline-flex max-w-lg items-center gap-2 rounded-[6px] border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm text-primary">
      <Megaphone className="size-4 shrink-0" />
      <span className="text-pretty font-medium leading-snug">
        {announcement.message}
      </span>
    </div>
  );
}
