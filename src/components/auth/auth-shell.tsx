import Link from "next/link";
import { Logo } from "@/components/logo";
import { MarketingBackground } from "@/components/marketing-background";

/** Centered, branded container for the auth pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <MarketingBackground />
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
