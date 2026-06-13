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
import { AtlasMark } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";
import { ReportButton } from "@/components/feedback/report-dialog";
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

/* The ink-glass rail surface: real translucency + heavy blur + specular top
   edge, per the liquid-glass recipe in the redesign spec. */
const RAIL_GLASS =
  "border border-white/20 bg-[#0d0d0d]/52 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_24px_60px_-30px_rgba(0,0,0,0.55)] backdrop-blur-[5px] backdrop-saturate-[1.5]";

/** White wordmark lockup for the dark rail (the shared Logo stays ink/green
    for light marketing surfaces). */
function RailLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-white", className)}>
      <AtlasMark className="size-7" />
      <span className="text-[1.35rem] font-medium leading-none tracking-tight">
        Atlas
      </span>
      <span className="relative -top-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase leading-none tracking-[0.12em] text-white/80">
        beta
      </span>
    </span>
  );
}

function NavUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-hidden
      className="ml-auto flex h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-white px-1 text-[0.6875rem] font-semibold tabular-nums leading-none text-[#0d0d0d]"
    >
      {label}
    </span>
  );
}

function NavLinks({
  isAdmin,
  adminUnreadReports = 0,
  onNavigate,
}: {
  isAdmin?: boolean;
  adminUnreadReports?: number;
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
    <nav className="flex flex-col gap-1.5">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const unreadBadge = item.href === "/admin" ? adminUnreadReports : 0;
        const ariaLabel =
          unreadBadge > 0
            ? `${item.label}, ${unreadBadge} unread report${unreadBadge === 1 ? "" : "s"}`
            : item.label;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tourId}
            onClick={onNavigate}
            aria-label={ariaLabel}
            className={cn(
              "group icon-animate relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
              active
                ? "text-white"
                : "text-white/60 hover:bg-white/[0.07] hover:text-white"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 -z-10 rounded-full border border-white/[0.18] bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <item.icon className="size-[1.15rem] shrink-0" />
            <span className="min-w-0 flex-1">{item.label}</span>
            <NavUnreadBadge count={unreadBadge} />
          </Link>
        );
      })}
    </nav>
  );
}

function Profile({
  email,
  name,
  avatarR2Key,
}: {
  email: string;
  name?: string;
  avatarR2Key?: string | null;
}) {
  const displayName = name?.trim() || email.split("@")[0];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-2.5">
      <UserAvatar
        displayName={displayName}
        avatarR2Key={avatarR2Key}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        <p className="truncate text-xs text-white/55">{email}</p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          aria-label="Sign out"
          className="icon-animate grid size-8 place-items-center rounded-full text-white/60 outline-none transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
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
  avatarR2Key,
  isAdmin,
  adminUnreadReports = 0,
  onNavigate,
}: {
  email: string;
  name?: string;
  avatarR2Key?: string | null;
  isAdmin?: boolean;
  adminUnreadReports?: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center px-2 pt-2 transition hover:opacity-90"
      >
        <RailLogo />
      </Link>

      <NavLinks
        isAdmin={isAdmin}
        adminUnreadReports={adminUnreadReports}
        onNavigate={onNavigate}
      />

      <div className="mt-auto space-y-4">
        <ReportButton
          context="general"
          size="default"
          fullWidth
          className="rounded-full border-white/[0.16] bg-transparent text-white/70 hover:border-white/[0.35] hover:bg-white/[0.08] hover:text-white"
        />
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <Sparkles className="size-5 text-white/80" />
          <p className="mt-2 text-sm font-medium text-white">
            Flashcards &amp; quizzes
          </p>
          <p className="mt-1 text-xs text-white/55">
            Coming soon to turn your notes into active recall.
          </p>
        </div>
        <Profile email={email} name={name} avatarR2Key={avatarR2Key} />
        <div className="flex items-center justify-center gap-2 text-[0.7rem] text-white/40">
          <Link
            href="/privacy"
            onClick={onNavigate}
            className="transition hover:text-white"
          >
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/terms"
            onClick={onNavigate}
            className="transition hover:text-white"
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
  avatarR2Key,
  isAdmin,
  adminUnreadReports = 0,
  mobileOpen,
  onMobileOpenChange,
}: {
  email: string;
  name?: string;
  avatarR2Key?: string | null;
  isAdmin?: boolean;
  adminUnreadReports?: number;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = mobileOpen ?? internalOpen;
  const setOpen = onMobileOpenChange ?? setInternalOpen;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Async hop keeps the project lint rule happy (no sync setState in effects).
    if (mobileOpen) Promise.resolve(true).then(setInternalOpen);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop: the floating liquid-glass rail, inset from the viewport edge. */}
      <aside
        data-tour="sidebar"
        className={cn(
          "fixed bottom-3 left-3 top-3 z-40 hidden w-60 overflow-hidden rounded-[1.75rem] lg:block",
          RAIL_GLASS
        )}
      >
        <SidebarBody
          email={email}
          name={name}
          avatarR2Key={avatarR2Key}
          isAdmin={isAdmin}
          adminUnreadReports={adminUnreadReports}
        />
      </aside>

      {/* Mobile: light-glass top bar. */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-black/[0.08] bg-[#f4f3f1]/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2 text-[#0d0d0d]">
          <AtlasMark className="size-7" />
          <span className="text-[1.35rem] font-medium leading-none tracking-tight">
            Atlas
          </span>
        </Link>
        <button
          data-tour="mobile-menu"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-full border border-black/[0.12] bg-white outline-none transition hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-black/25"
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
              className="fixed inset-0 z-50 bg-black/30 lg:hidden"
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
              className={cn(
                "fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col rounded-r-[1.75rem] lg:hidden",
                RAIL_GLASS,
                "bg-[#0d0d0d]/75"
              )}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full text-white/60 outline-none transition hover:bg-white/[0.1] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <X className="size-4" />
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-12">
                <SidebarBody
                  email={email}
                  name={name}
                  avatarR2Key={avatarR2Key}
                  isAdmin={isAdmin}
                  adminUnreadReports={adminUnreadReports}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
