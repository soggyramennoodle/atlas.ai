"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X, LayoutDashboard, ArrowUpRight } from "lucide-react";
import { AtlasMark } from "@/components/logo";
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
  { href: "/#insights", label: "Insights" },
  { href: "/#how", label: "How it works" },
  { href: "/#ai", label: "AI Intelligence" },
  { href: "/newsroom", label: "Newsroom" },
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
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-8">
      <div className="relative flex h-12 items-center">
        {/* Left: mark + wordmark */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <AtlasMark className="size-7 text-white" />
          <span className="font-heading text-[1.25rem] font-semibold leading-none tracking-tight text-white">
            Atlas
          </span>
        </Link>

        {/* Center: frosted glass pill (desktop) */}
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[rgba(28,28,28,0.75)] p-[6px] px-2 backdrop-blur-[12px] lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-heading rounded-full px-4 py-2 text-[14px] font-normal text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right: auth-aware actions */}
        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/dashboard"
                className="font-heading inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Dashboard
                <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
              </Link>
              <UserMenu
                email={email}
                displayName={displayName ?? email.split("@")[0]}
                avatarR2Key={avatarR2Key}
              />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="font-heading rounded-full px-4 py-2 text-[14px] text-white/80 transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="font-heading rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Start for free
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-[rgba(28,28,28,0.75)] text-white backdrop-blur-[12px] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile panel — detached dark glass sheet. */}
      {open && (
        <div className="mt-3 rounded-[20px] border border-white/10 bg-[rgba(20,20,20,0.92)] p-2 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-heading block rounded-[12px] px-3 py-2.5 text-[15px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-white/10" />
          {email ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="font-heading block rounded-[12px] px-3 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-white/10"
              >
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <button className="font-heading w-full rounded-[12px] px-3 py-2.5 text-left text-[15px] text-white/70 transition-colors hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <div className="grid gap-2 p-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="font-heading rounded-full border border-white/15 px-4 py-2.5 text-center text-[14px] text-white transition-colors hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="font-heading rounded-full bg-white px-4 py-2.5 text-center text-[14px] font-medium text-black"
              >
                Start for free
              </Link>
            </div>
          )}
        </div>
      )}
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
        <button className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/60">
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
