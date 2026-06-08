"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
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
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or user ID…"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {filtered.length} of {users.length}{" "}
        {users.length === 1 ? "user" : "users"}
        {truncated && " · showing first 5000"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-[4px] border border-dashed py-16 text-center">
          <Users className="size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No users match.</p>
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
