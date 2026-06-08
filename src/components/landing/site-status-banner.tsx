import { Megaphone } from "lucide-react";
import type { SiteAnnouncement } from "@/lib/types";

export function SiteStatusBanner({
  announcement,
}: {
  announcement: SiteAnnouncement | null;
}) {
  if (!announcement) return null;

  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto flex max-w-[1200px] justify-center pt-[clamp(4rem,14vh,8.5rem)]">
        <div className="w-full max-w-lg rounded-[4px] border border-border bg-background/85 px-4 py-3.5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.04),0_14px_34px_-20px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:px-5 sm:py-4">
          <div className="flex items-center justify-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-border bg-card text-primary">
              <Megaphone className="size-4" />
            </span>
            <p className="text-pretty text-sm font-medium leading-snug text-foreground">
              {announcement.message}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
