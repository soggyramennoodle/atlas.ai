import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { MarketingBackground } from "@/components/marketing-background";
import { MarketingThemeLock } from "@/components/marketing-theme-lock";
import { LogoutToast } from "@/components/logout-toast";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingThemeLock />
      <MarketingBackground />
      <SiteHeader />
      <Suspense fallback={null}>
        <LogoutToast />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
