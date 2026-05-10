import { useEffect } from "react";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingTicker } from "@/components/landing/LandingTicker";
import { LandingPartners } from "@/components/landing/LandingPartners";
import { LandingFeatured } from "@/components/landing/LandingFeatured";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingMap } from "@/components/landing/LandingMap";
import { LandingDualCta } from "@/components/landing/LandingDualCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Index() {
  useEffect(() => {
    document.title = "Farmchain · Tokenização de ativos reais";
  }, []);

  return (
    <LandingLayout>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingTicker />
        <LandingPartners />
        <LandingFeatured />
        <LandingHowItWorks />
        <LandingBenefits />
        <LandingMap />
        <LandingDualCta />
      </main>
      <LandingFooter />
    </LandingLayout>
  );
}
