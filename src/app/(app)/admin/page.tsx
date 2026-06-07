import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Megaphone, ShieldCheck, ChevronRight } from "lucide-react";
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
] as const;

export default async function AdminHubPage() {
  // Admin-only: hide the area's existence from everyone else.
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

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
          {ACTIONS.map((action) => (
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
                  <h2 className="font-medium">{action.title}</h2>
                  <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
