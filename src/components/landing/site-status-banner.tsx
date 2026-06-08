import { Megaphone } from "lucide-react";
import type { SiteAnnouncement } from "@/lib/types";

export function SiteStatusBanner({
  announcement,
}: {
  announcement: SiteAnnouncement | null;
}) {
  if (!announcement) return null;

  return (
    <div className="px-4 pt-10 sm:px-6 sm:pt-12 lg:pt-14">
      <div className="mx-auto max-w-[1200px]">
        <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-primary/25 bg-primary/8 px-4 py-2 text-sm text-foreground shadow-[0_8px_24px_-16px_rgba(10,87,54,0.45)]">
          <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            <Megaphone className="size-3.5" />
          </span>
          <span className="text-pretty font-medium">{announcement.message}</span>
        </div>
      </div>
    </div>
  );
}
