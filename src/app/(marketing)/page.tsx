import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { SubjectsMarquee } from "@/components/landing/subjects-marquee";
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

  return (
    <>
      <Hero ctaHref={ctaHref} />
      <SubjectsMarquee />
      <HowItWorks />
      <FeaturesBento />
      <Faq />
      <PrivacyTrust />
      <FinalCta ctaHref={ctaHref} />
    </>
  );
}
