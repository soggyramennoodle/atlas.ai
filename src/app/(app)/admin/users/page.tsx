import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { UserList } from "@/components/admin/user-list";
import { listAdminUsers } from "@/lib/admin-users-server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";

export const metadata: Metadata = { title: "Users · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const { rows, truncated } = await listAdminUsers();

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-4xl">
        <AdminBackLink fallbackHref="/admin" label="Back" />

        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Users className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Every signed-up account, by email and sign-in method. Resend a magic
            link, suspend an account, or delete it entirely (which also purges
            their notes, recordings and stored audio).
          </p>
        </div>

        <div className="mt-8">
          <UserList
            users={rows}
            currentUserId={admin.id}
            truncated={truncated}
          />
        </div>
      </div>
    </main>
  );
}
