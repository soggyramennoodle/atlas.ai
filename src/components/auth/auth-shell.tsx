import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthStoryPanel } from "@/components/auth/auth-story-panel";

/**
 * The auth stage: split editorial layout on desktop (naked form column on the
 * #fafafa canvas + inset cinematic story panel), single column on mobile with
 * a compact story banner above the form.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      {/* Form column */}
      <div className="flex flex-1 flex-col px-6 pb-8 pt-6 sm:px-10 lg:px-14">
        <div className="flex justify-center lg:justify-start">
          <Link href="/">
            <Logo className="text-[#0d0d0d]" />
          </Link>
        </div>

        {/* Mobile story banner — no bars, no rotation */}
        <div className="mt-6 lg:hidden">
          <AuthStoryPanel compact />
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[26rem] py-10">{children}</div>
        </div>

        <p className="mx-auto w-full max-w-[26rem] text-xs text-[#0d0d0d]/45 text-pretty">
          By continuing you agree to use Atlas responsibly with content you
          have the right to record.
        </p>
      </div>

      {/* Story panel — desktop only */}
      <div className="hidden p-4 lg:flex lg:w-[44%] xl:w-[46%]">
        <AuthStoryPanel />
      </div>
    </main>
  );
}
