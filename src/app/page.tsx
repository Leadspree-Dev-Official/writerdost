"use client";

import WebsiteNavbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import LogosTicker from "@/components/website/LogosTicker";
import ProblemSection from "@/components/website/ProblemSection";
import HowItWorks from "@/components/website/HowItWorks";
import FeatureBentoGrid from "@/components/website/FeatureBentoGrid";
import ComparisonMatrix from "@/components/website/ComparisonMatrix";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import PricingSection from "@/components/website/PricingSection";
import FaqSection from "@/components/website/FaqSection";
import CtaBanner from "@/components/website/CtaBanner";
import WebsiteFooter from "@/components/website/WebsiteFooter";

// Deferred sections available if needed:
// import AgentSwarmDeepDive from "@/components/website/AgentSwarmDeepDive";
// import PersonasSection from "@/components/website/PersonasSection";
// import RoiCalculator from "@/components/website/RoiCalculator";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-surface text-on-surface flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <WebsiteNavbar />

      {/* Main Marketing Content Flow */}
      <main className="flex-1 w-full overflow-hidden">
        {/* 1. Hero with Live Interactive Studio Simulation & Metrics */}
        <Hero />

        {/* 2. Supported LLM & Ecosystem Integrations */}
        <LogosTicker />

        {/* 3. The Core Problem: Why Existing AI Writing Tools Break Down */}
        <ProblemSection />

        {/* 4. 4-Step Interactive How-It-Works */}
        <HowItWorks />

        {/* 5. Complete Feature Bento Grid */}
        <FeatureBentoGrid />

        {/* 6. Direct Comparison: Writerdost vs Generic AI vs Ghostwriters */}
        <ComparisonMatrix />

        {/* 7. Early Adopter Showcase (Real Beta Projects) */}
        <TestimonialsSection />

        {/* 8. Free Beta Access */}
        <PricingSection />

        {/* 9. Frequently Asked Questions Accordion */}
        <FaqSection />

        {/* 10. Final High-Conversion CTA */}
        <CtaBanner />
      </main>

      {/* Comprehensive Website Footer */}
      <WebsiteFooter />
    </div>
  );
}
