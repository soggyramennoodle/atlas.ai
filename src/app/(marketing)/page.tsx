import { createClient } from "@/lib/supabase/server";
import { getPublicAnnouncement } from "@/lib/site-announcement";
import { IntroProvider } from "@/components/landing/intro";
import { Hero } from "@/components/landing/hero";
import { SubjectsMarquee } from "@/components/landing/subjects-marquee";
import { Insights } from "@/components/landing/insights";
import { AiIntelligence } from "@/components/landing/ai-intelligence";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PersonalizationDemo } from "@/components/landing/personalization-demo";
import { Testimonials } from "@/components/landing/testimonials";
import { PrivacyTrust } from "@/components/landing/privacy-trust";
import { FinalCta } from "@/components/landing/cta";
import { LandingFootnotes } from "@/components/landing/footnotes";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/upload" : "/signup";
  const announcement = await getPublicAnnouncement();

  return (
    <>
      {/* Pre-paint gate: if this session already saw the intro, flag it before
          first paint so the SSR-rendered splash is display:none'd (no flash).
          Runs synchronously during HTML parse, ahead of the overlay markup. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(sessionStorage.getItem('atlas:introSeen')){document.documentElement.setAttribute('data-intro-seen','1')}}catch(e){}",
        }}
      />
      <IntroProvider>
        <Hero ctaHref={ctaHref} announcement={announcement} />
        <SubjectsMarquee />
        <Insights />
        <AiIntelligence ctaHref={ctaHref} />
        <HowItWorks />
        <PersonalizationDemo />
        <Testimonials />
        <PrivacyTrust />
        <FinalCta ctaHref={ctaHref} />
        <LandingFootnotes />
      </IntroProvider>
    </>
  );
}
