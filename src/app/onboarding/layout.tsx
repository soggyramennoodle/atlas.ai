import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { MarketingThemeLock } from "@/components/marketing-theme-lock";
import { AppCanvas } from "@/components/app/glass";

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

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${interTight.variable} ${instrumentSerif.variable} font-heading isolate flex min-h-svh flex-1 flex-col bg-[#f4f3f1] text-[#0d0d0d]`}
    >
      <AppCanvas />
      <MarketingThemeLock />
      {children}
    </div>
  );
}
