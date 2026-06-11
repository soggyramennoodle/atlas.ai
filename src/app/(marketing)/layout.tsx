import { Suspense } from "react";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { MarketingThemeLock } from "@/components/marketing-theme-lock";
import { LogoutToast } from "@/components/logout-toast";

/* The cinematic landing language: Inter Tight for headings/UI, Instrument
   Serif for the italic accent words. Scoped to marketing surfaces only — the
   app keeps Geist. */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter-tight",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `dark` flips the semantic tokens for every marketing surface (newsroom,
    // legal pages) so the shared shell stays coherent with the black landing.
    <div
      className={`${interTight.variable} ${instrumentSerif.variable} dark font-heading relative flex min-h-svh flex-1 flex-col bg-[#000]`}
    >
      <MarketingThemeLock />
      <SiteHeader />
      <Suspense fallback={null}>
        <LogoutToast />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
