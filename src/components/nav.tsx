"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav({ email }: { email: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const next = window.scrollY > 24;
      if (next === scrolledRef.current) return;
      scrolledRef.current = next;
      setScrolled(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const initials = email ? email[0]?.toUpperCase() : "?";

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4">
      <motion.nav
        initial={false}
        animate={{
          backgroundColor: scrolled
            ? "color-mix(in oklch, var(--background) 72%, transparent)"
            : "color-mix(in oklch, var(--background) 0%, transparent)",
          borderColor: scrolled
            ? "color-mix(in oklch, var(--border) 100%, transparent)"
            : "color-mix(in oklch, var(--border) 0%, transparent)",
          boxShadow: scrolled
            ? "0 8px 30px -12px color-mix(in oklch, var(--primary) 22%, transparent)"
            : "0 0 0 0 transparent",
        }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          // No backdrop-filter: this wide bar is fixed over the drifting
          // background blooms, and blurring a moving backdrop forces a re-blur
          // every frame (a Chrome GPU sink). When scrolled it gets a ~72%
          // opaque background, so the blur added almost nothing visually anyway.
          "flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border px-3 py-2 sm:px-4"
        )}
      >
        <Link href="/" className="shrink-0 transition hover:-translate-y-px">
          <Logo beta />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:-translate-y-px hover:text-foreground"
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
              <UserMenu email={email} initials={initials} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="group relative">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border bg-background/60 md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </motion.nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-[4.5rem] w-[calc(100%-2rem)] max-w-5xl rounded-2xl border bg-background/90 p-2 shadow-xl backdrop-blur-xl md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
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
                className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <button className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent">
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
        </motion.div>
      )}
    </header>
  );
}

function UserMenu({ email, initials }: { email: string; initials: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none transition hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-9 border">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
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
