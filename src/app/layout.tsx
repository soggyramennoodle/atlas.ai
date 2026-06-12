import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import {
  ATLAS_DEFAULT_TITLE,
  ATLAS_DESCRIPTION,
  ATLAS_CANVAS,
  ATLAS_SITE_NAME,
  ATLAS_SITE_URL,
} from "@/lib/atlas-brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(ATLAS_SITE_URL),
  title: {
    default: ATLAS_DEFAULT_TITLE,
    template: `%s · ${ATLAS_SITE_NAME}`,
  },
  description: ATLAS_DESCRIPTION,
  applicationName: ATLAS_SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: ATLAS_SITE_URL,
    siteName: ATLAS_SITE_NAME,
    title: ATLAS_DEFAULT_TITLE,
    description: ATLAS_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: ATLAS_DEFAULT_TITLE,
    description: ATLAS_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: ATLAS_SITE_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: ATLAS_CANVAS },
    { media: "(prefers-color-scheme: dark)", color: ATLAS_CANVAS },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
