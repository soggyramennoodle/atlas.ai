"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav({
  email,
  displayName,
  avatarR2Key,
}: {
  email: string | null;
  displayName: string | null;
  avatarR2Key: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    // The <header> is a transparent sticky shell — no full-width strip. The
    // inner container is the visible floating bar, inset from the top and sides.
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-[1200px] px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="flex h-16 items-center justify-between gap-4 rounded-[6px] border border-border bg-background/85 px-4 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_14px_34px_-20px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:h-[68px] sm:px-5">
          <Link
            href="/"
            className="shrink-0 rounded-[4px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo beta size="lg" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[4px] px-3.5 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {email ? (
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <UserMenu
                  email={email}
                  displayName={displayName ?? email.split("@")[0]}
                  avatarR2Key={avatarR2Key}
                />
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            )}

            <button
              onClick={() => setOpen((v) => !v)}
              className="grid size-10 place-items-center rounded-[4px] border border-border bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile panel — a detached floating sheet aligned to the bar, not a
            full-width strip. */}
        {open && (
          <div className="mt-2 rounded-[6px] border border-border bg-background/95 p-2 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_14px_34px_-20px_rgba(15,23,42,0.32)] backdrop-blur-xl md:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-[4px] px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {email ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block rounded-[4px] px-3 py-2.5 text-[15px] font-medium transition-colors hover:bg-accent"
                >
                  Dashboard
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="w-full rounded-[4px] px-3 py-2.5 text-left text-[15px] text-muted-foreground transition-colors hover:bg-accent">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="grid gap-2 p-1">
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function UserMenu({
  email,
  displayName,
  avatarR2Key,
}: {
  email: string;
  displayName: string;
  avatarR2Key: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-[4px] outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
          <UserAvatar
            displayName={displayName}
            avatarR2Key={avatarR2Key}
            className="size-9"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="size-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/signout" method="post" className="w-full">
            <button className="flex w-full items-center gap-2 text-left">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
