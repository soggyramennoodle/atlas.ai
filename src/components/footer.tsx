import Link from "next/link";
import { Mail } from "lucide-react";
import { AtlasMark, BetaBadge } from "@/components/logo";

/** Instagram glyph (lucide dropped brand icons, so we inline it). */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Discord glyph. */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.432 3c-.21.375-.455.88-.624 1.28a18.27 18.27 0 0 0-5.62 0A12.6 12.6 0 0 0 8.56 3 19.74 19.74 0 0 0 3.677 4.37C.533 9.046-.32 13.58.099 18.057a19.9 19.9 0 0 0 6.073 3.058c.491-.669.93-1.38 1.307-2.127a12.94 12.94 0 0 1-2.058-.986c.173-.127.342-.26.505-.396 3.97 1.833 8.27 1.833 12.192 0 .166.137.335.27.505.396-.657.387-1.348.72-2.062.988.378.745.816 1.457 1.307 2.126a19.84 19.84 0 0 0 6.075-3.058c.5-5.19-.838-9.683-3.51-13.69ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.952-2.42 2.157-2.42 1.21 0 2.178 1.096 2.157 2.42 0 1.335-.953 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.954-2.42 2.157-2.42 1.211 0 2.179 1.096 2.158 2.42 0 1.335-.947 2.42-2.158 2.42Z" />
    </svg>
  );
}

/** A social entry with a "Soon" hover bubble. */
function SoonSocial({
  icon: Icon,
  label,
}: {
  icon: (p: { className?: string }) => React.ReactElement;
  label: string;
}) {
  return (
    <li className="group relative w-fit">
      <span className="inline-flex cursor-default items-center gap-2 text-white/55 transition group-hover:text-white">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 scale-90 rounded-full border border-white/15 bg-[rgba(28,28,28,0.9)] px-2.5 py-1 text-[0.65rem] font-medium text-white opacity-0 shadow-lg backdrop-blur transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        Soon
      </span>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="font-heading border-t border-white/10 bg-[#000]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <span className="inline-flex items-center gap-2">
              <AtlasMark className="size-7 text-white" />
              <span className="text-[1.35rem] font-semibold leading-none tracking-tight text-white">
                Atlas
              </span>
              <BetaBadge className="border-white/30 from-white/25 to-white/5 text-white" />
            </span>
            <p className="mt-3 text-sm text-pretty text-white/55">
              A smart study assistant that turns lecture recordings into
              thorough, structured notes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-4 sm:gap-12">
            <div className="space-y-3">
              <p className="font-medium text-white">Product</p>
              <ul className="space-y-2 text-white/55">
                <li>
                  <Link href="/#how" className="transition hover:text-white">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/#insights" className="transition hover:text-white">
                    Insights
                  </Link>
                </li>
                <li>
                  <Link href="/newsroom" className="transition hover:text-white">
                    Newsroom
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="transition hover:text-white">
                    Record a lecture
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-white">Account</p>
              <ul className="space-y-2 text-white/55">
                <li>
                  <Link href="/login" className="transition hover:text-white">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="transition hover:text-white">
                    Start for free
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-white">Legal</p>
              <ul className="space-y-2 text-white/55">
                <li>
                  <Link href="/privacy" className="transition hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="transition hover:text-white"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-white">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-white">Socials</p>
              <ul className="space-y-2">
                <SoonSocial icon={InstagramIcon} label="Instagram" />
                <SoonSocial icon={DiscordIcon} label="Discord" />
                <li>
                  <a
                    href="mailto:hello@atlasai.ca"
                    className="inline-flex items-center gap-2 text-white/55 transition hover:text-white"
                  >
                    <Mail className="size-4" />
                    Contact us
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()}. Atlas Co. Made with Love in Toronto 🇨🇦</p>
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
