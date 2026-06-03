import Link from "next/link";
import { Logo } from "@/components/logo";

/** Centered, branded container for the auth pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(60%_50%_at_50%_40%,black,transparent)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo beta className="scale-110" />
          </Link>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to use Atlas responsibly with content you have
          the right to record.
        </p>
      </div>
    </main>
  );
}
