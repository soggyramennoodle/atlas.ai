"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { ADMIN_INPUT, AdminEmpty } from "@/components/admin/admin-kit";
import { UserRow } from "@/components/admin/user-row";
import type { AdminUserRow } from "@/lib/admin-users";

export function UserList({
  users,
  currentUserId,
  truncated,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  truncated: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or user ID…"
          className={`${ADMIN_INPUT} h-11 pl-10`}
          autoComplete="off"
        />
      </div>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
        {filtered.length} of {users.length}{" "}
        {users.length === 1 ? "user" : "users"}
        {truncated && " · showing first 5000"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <AdminEmpty
            icon={Users}
            title="No users match"
            body="Try a different email or user ID."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
