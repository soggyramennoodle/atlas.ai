import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpatialBackground } from "@/components/spatial-background";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// The geometric display face of Spatial Liquid Glass — crisp, techy headlines.
// Exposed as --font-display; the legacy --font-serif slot maps onto it in CSS.
const display = Space_Grotesk({
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Atlas — Your lectures, beautifully noted",
    template: "%s · Atlas",
  },
  description:
    "Atlas is a smart study assistant for students. Upload a lecture recording and get thorough, structured notes — so you can listen, not scramble to write.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <SpatialBackground />
          <div aria-hidden className="noise-overlay" />
          {children}
          <ThemeToggle />
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
