"use client";

import WebsiteNavbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import LogosTicker from "@/components/website/LogosTicker";
import AgentSwarmDeepDive from "@/components/website/AgentSwarmDeepDive";
import FeatureBentoGrid from "@/components/website/FeatureBentoGrid";
import HowItWorks from "@/components/website/HowItWorks";
import ComparisonMatrix from "@/components/website/ComparisonMatrix";
import PersonasSection from "@/components/website/PersonasSection";
import RoiCalculator from "@/components/website/RoiCalculator";
import PricingSection from "@/components/website/PricingSection";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import FaqSection from "@/components/website/FaqSection";
import CtaBanner from "@/components/website/CtaBanner";
import WebsiteFooter from "@/components/website/WebsiteFooter";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-surface text-on-surface flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <WebsiteNavbar />

      {/* Main Marketing Content Flow */}
      <main className="flex-1 w-full overflow-hidden">
        {/* 1. Hero with Live Interactive Studio Simulation */}
        <Hero />

        {/* 2. Supported LLM & Ecosystem Integrations */}
        <LogosTicker />

        {/* 3. The 4-Agent Autonomous Swarm Deep-Dive */}
        <AgentSwarmDeepDive />

        {/* 4. Complete Feature Bento Grid */}
        <FeatureBentoGrid />

        {/* 5. 4-Step Interactive How-It-Works */}
        <HowItWorks />

        {/* 6. Direct Comparison: Writerdost vs Generic AI vs Ghostwriters */}
        <ComparisonMatrix />

        {/* 7. Tailored Solutions by Persona (Authors, Agencies, Bloggers, Experts) */}
        <PersonasSection />

        {/* 8. Interactive ROI & Cost-Savings Calculator */}
        <RoiCalculator />

        {/* 9. Transparent Monthly/Annual Pricing */}
        <PricingSection />

        {/* 10. Wall of Love / Author Testimonials */}
        <TestimonialsSection />

        {/* 11. Frequently Asked Questions Accordion */}
        <FaqSection />

        {/* 12. Final High-Energy Cosmic Conversion CTA */}
        <CtaBanner />
      </main>

      {/* Comprehensive Website Footer */}
      <WebsiteFooter />
    </div>
  );
}
