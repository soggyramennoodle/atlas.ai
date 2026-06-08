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
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <ShieldCheck className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Admin console
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
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
                className="group flex items-start gap-4 rounded-[4px] border bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:border-foreground/25 hover:bg-secondary/40"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
                  <action.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">{action.title}</h2>
                      {unread > 0 && (
                        <span className="rounded-[3px] border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-destructive">
                          {unread} unread
                        </span>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
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
