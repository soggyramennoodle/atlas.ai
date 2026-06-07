"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Mic,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSelector } from "@/components/theme-selector";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tourId: string;
  external?: boolean;
};

const BASE_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tourId: "nav-dashboard",
  },
  {
    href: "/upload",
    label: "Record a lecture",
    icon: Mic,
    tourId: "nav-upload",
  },
  {
    href: "/newsroom",
    label: "What's new",
    icon: Newspaper,
    tourId: "nav-newsroom",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    tourId: "nav-settings",
  },
];

function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const nav: NavItem[] = isAdmin
    ? [
        ...BASE_NAV,
        {
          href: "/admin",
          label: "Admin",
          icon: ShieldCheck,
          tourId: "nav-admin",
        },
      ]
    : BASE_NAV;
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tourId}
            onClick={onNavigate}
            className={cn(
              "group icon-animate relative flex items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 -z-10 rounded-[4px] border border-border bg-secondary"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <item.icon className="size-[1.15rem] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Profile({ email, name }: { email: string; name?: string }) {
  const displayName = name?.trim() || email.split("@")[0];
  const initials = (displayName[0] ?? email[0] ?? "?").toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-[4px] border border-border bg-background p-2.5">
      <Avatar className="size-9 rounded-[4px] border border-border">
        <AvatarFallback className="rounded-[4px] bg-secondary text-sm font-semibold text-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          aria-label="Sign out"
          className="hover-glow icon-animate grid size-8 place-items-center rounded-[4px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

function SidebarBody({
  email,
  name,
  isAdmin,
  onNavigate,
}: {
  email: string;
  name?: string;
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center px-2 pt-2 transition hover:opacity-90"
      >
        <Logo beta />
      </Link>

      <NavLinks isAdmin={isAdmin} onNavigate={onNavigate} />

      <div className="mt-auto space-y-4">
        <ThemeSelector />
        <div className="hover-glow icon-animate rounded-[4px] border border-border bg-secondary p-4">
          <Sparkles className="size-5 text-primary" />
          <p className="mt-2 text-sm font-medium">Flashcards & quizzes</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coming soon to turn your notes into active recall.
          </p>
        </div>
        <Profile email={email} name={name} />
        <div className="flex items-center justify-center gap-2 text-[0.7rem] text-muted-foreground/70">
          <Link
            href="/privacy"
            onClick={onNavigate}
            className="transition hover:text-foreground"
          >
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/terms"
            onClick={onNavigate}
            className="transition hover:text-foreground"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({
  email,
  name,
  isAdmin,
  mobileOpen,
  onMobileOpenChange,
}: {
  email: string;
  name?: string;
  isAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = mobileOpen ?? internalOpen;
  const setOpen = onMobileOpenChange ?? setInternalOpen;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (mobileOpen) setInternalOpen(true);
  }, [mobileOpen]);

  return (
    <>
      <aside
        data-tour="sidebar"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block"
      >
        <SidebarBody email={email} name={name} isAdmin={isAdmin} />
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-card/85 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Link href="/dashboard">
          <Logo beta />
        </Link>
        <button
          data-tour="mobile-menu"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-[4px] border border-border bg-background"
        >
          <Menu className="size-4" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/20 lg:hidden"
            />
            <motion.aside
              data-tour="sidebar-mobile"
              initial={reduceMotion ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 340, damping: 34 }
              }
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-[4px] text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
              <SidebarBody
                email={email}
                name={name}
                isAdmin={isAdmin}
                onNavigate={() => setOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
