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
  { href: "/#ai", label: "Atlas AI" },
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
          className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        >
          <AtlasMark className="size-7 text-[#0d0d0d]" />
          <span className="font-heading text-[1.25rem] font-semibold leading-none tracking-tight text-[#0d0d0d]">
            Atlas
          </span>
        </Link>

        {/* Center: frosted glass pill (desktop) */}
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-black/10 bg-white/70 p-[6px] px-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-[12px] lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-heading rounded-full px-4 py-2 text-[14px] font-normal text-black/70 transition-colors hover:bg-black/[0.06] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
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
                className="font-heading inline-flex items-center gap-1.5 rounded-full bg-[#0d0d0d] px-5 py-2.5 text-[14px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
                className="font-heading rounded-full px-4 py-2 text-[14px] text-black/70 transition-colors hover:text-black"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="font-heading rounded-full bg-[#0d0d0d] px-5 py-2.5 text-[14px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Start for free
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/70 text-[#0d0d0d] backdrop-blur-[12px] transition-colors hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile panel — detached dark glass sheet. */}
      {open && (
        <div className="mt-3 rounded-[20px] border border-black/10 bg-white/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.10)] backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-heading block rounded-[12px] px-3 py-2.5 text-[15px] text-black/70 transition-colors hover:bg-black/[0.05] hover:text-black"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-black/10" />
          {email ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="font-heading block rounded-[12px] px-3 py-2.5 text-[15px] font-medium text-[#0d0d0d] transition-colors hover:bg-black/[0.05]"
              >
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <button className="font-heading w-full rounded-[12px] px-3 py-2.5 text-left text-[15px] text-black/60 transition-colors hover:bg-black/[0.05]">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <div className="grid gap-2 p-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="font-heading rounded-full border border-black/15 px-4 py-2.5 text-center text-[14px] text-[#0d0d0d] transition-colors hover:bg-black/[0.05]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="font-heading rounded-full bg-[#0d0d0d] px-4 py-2.5 text-center text-[14px] font-medium text-white"
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
        <button className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-black/40">
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
