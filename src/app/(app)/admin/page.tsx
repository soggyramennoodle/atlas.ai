import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Flag,
  ListOrdered,
  Megaphone,
  ShieldCheck,
  Users,
  ChevronRight,
  Globe2,
} from "lucide-react";
import { countUnreadFeedback } from "@/lib/admin-feedback-server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { ADMIN_EYEBROW, CARD, cn } from "@/components/admin/admin-kit";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const ACTIONS = [
  {
    href: "/admin/processing",
    icon: Activity,
    title: "Processing",
    description:
      "Live status of recordings and uploads moving through the pipeline.",
  },
  {
    href: "/admin/newsroom",
    icon: Megaphone,
    title: "Newsroom",
    description: "Publish announcements, product updates and notices.",
  },
  {
    href: "/admin/jobs",
    icon: ListOrdered,
    title: "Jobs",
    description:
      "Pipeline jobs with retention countdowns and automatic stale-job cleanup.",
  },
  {
    href: "/admin/feedback",
    icon: Flag,
    title: "User reports",
    description:
      "Note quality reports and general feedback from students.",
  },
  {
    href: "/admin/users",
    icon: Users,
    title: "Users",
    description:
      "Accounts by email and sign-in method. Resend links, suspend, or delete.",
  },
  {
    href: "/admin/site",
    icon: Globe2,
    title: "Site",
    description:
      "Landing status pill, global sign-out queue, and broadcast messaging.",
  },
] as const;

export default async function AdminHubPage() {
  // Admin-only: hide the area's existence from everyone else.
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const unreadReports = await countUnreadFeedback();

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-4xl">
        <div>
          <span className={ADMIN_EYEBROW}>
            <ShieldCheck className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
            Admin <span className="font-instrument italic">console</span>
          </h1>
          <p className="mt-2 text-sm text-[#0d0d0d]/60">
            Choose an area to manage.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ACTIONS.map((action) => {
            const unread =
              action.href === "/admin/feedback" ? unreadReports : 0;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  CARD,
                  "group flex items-start gap-4 p-5 outline-none transition-[border-color,box-shadow] duration-300 hover:border-black/20 focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
                )}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.1] bg-black/[0.03] text-[#0d0d0d]">
                  <action.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-[#0d0d0d]">{action.title}</h2>
                      {unread > 0 && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-amber-700">
                          {unread} unread
                        </span>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#0d0d0d]/40 transition group-hover:translate-x-0.5 group-hover:text-[#0d0d0d]" />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#0d0d0d]/55">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
