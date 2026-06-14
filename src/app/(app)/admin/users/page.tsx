import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { UserList } from "@/components/admin/user-list";
import { listAdminUsers } from "@/lib/admin-users-server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { ADMIN_EYEBROW } from "@/components/admin/admin-kit";

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
          <span className={ADMIN_EYEBROW}>
            <Users className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">Users</h1>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
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
