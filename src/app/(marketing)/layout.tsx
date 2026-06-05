import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { MarketingBackground } from "@/components/marketing-background";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingBackground />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
