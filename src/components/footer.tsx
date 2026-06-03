import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden rounded-t-[2.5rem] border-t bg-card/50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto w-full max-w-5xl px-4 py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground text-pretty">
              A smart study assistant that turns lecture recordings into
              thorough, structured notes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:gap-16">
            <div className="space-y-3">
              <p className="font-medium">Product</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="/#how" className="hover:text-foreground">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="hover:text-foreground">
                    Record a lecture
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-medium">Account</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-foreground">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Atlas. Built for students.</p>
          <div className="flex items-center gap-2 font-mono">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
