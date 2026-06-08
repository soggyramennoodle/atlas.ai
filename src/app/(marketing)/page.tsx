import { createClient } from "@/lib/supabase/server";
import { SiteStatusBanner } from "@/components/landing/site-status-banner";
import { Hero } from "@/components/landing/hero";
import { getPublicAnnouncement } from "@/lib/site-announcement";
import { SubjectsMarquee } from "@/components/landing/subjects-marquee";
import { UniversitiesMarquee } from "@/components/landing/universities-marquee";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesBento } from "@/components/landing/features-bento";
import { Faq } from "@/components/landing/faq";
import { PrivacyTrust } from "@/components/landing/privacy-trust";
import { FinalCta } from "@/components/landing/cta";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/upload" : "/signup";
  const announcement = await getPublicAnnouncement();

  return (
    <>
      <SiteStatusBanner announcement={announcement} />
      <Hero ctaHref={ctaHref} />
      <SubjectsMarquee />
      <div aria-hidden className="h-12 sm:h-14 lg:h-16" />
      <UniversitiesMarquee />
      <HowItWorks />
      <FeaturesBento />
      <Faq />
      <PrivacyTrust />
      <FinalCta ctaHref={ctaHref} />
    </>
  );
}
