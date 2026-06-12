import { Inter_Tight, Instrument_Serif } from "next/font/google";

/* Cinematic-light language, scoped to the auth surface exactly like the
   marketing layout scopes it — the app shell never loads these fonts. */
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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${interTight.variable} ${instrumentSerif.variable} font-heading flex min-h-svh flex-1 flex-col bg-[#fafafa] text-[#0d0d0d]`}
    >
      {children}
    </div>
  );
}
