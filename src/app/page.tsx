"use client";

import WebsiteNavbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import LogosTicker from "@/components/website/LogosTicker";
import SwarmPipelineDiagram from "@/components/website/SwarmPipelineDiagram";
import ProblemSection from "@/components/website/ProblemSection";
import MetricsBanner from "@/components/website/MetricsBanner";
import HowItWorks from "@/components/website/HowItWorks";
import TemplatesShowcase from "@/components/website/TemplatesShowcase";
import FeatureBentoGrid from "@/components/website/FeatureBentoGrid";
import PersonasSection from "@/components/website/PersonasSection";
import ComparisonMatrix from "@/components/website/ComparisonMatrix";
import TestimonialsSection from "@/components/website/TestimonialsSection";
import RoiCalculator from "@/components/website/RoiCalculator";
import PricingSection from "@/components/website/PricingSection";
import FaqSection from "@/components/website/FaqSection";
import CtaBanner from "@/components/website/CtaBanner";
import WebsiteFooter from "@/components/website/WebsiteFooter";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-surface text-on-surface flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <WebsiteNavbar />

      {/* Main Marketing Content Flow */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full overflow-hidden focus:outline-hidden">
        {/* 1. Hero with Live Interactive Studio Simulation & Metrics */}
        <Hero />

        {/* 2. Supported LLM & Ecosystem Integrations */}
        <LogosTicker />

        {/* 3. 4-Agent Autonomous Swarm Architecture */}
        <SwarmPipelineDiagram />

        {/* 4. The Core Problem: Why Existing AI Writing Tools Break Down */}
        <ProblemSection />

        {/* 4. Hard Efficiency & Scale Metrics */}
        <MetricsBanner />

        {/* 5. 4-Step Interactive How-It-Works */}
        <HowItWorks />

        {/* 6. Pre-Tuned Book & Content Blueprints */}
        <TemplatesShowcase />

        {/* 7. Complete Feature Bento Grid */}
        <FeatureBentoGrid />

        {/* 8. Role-Based Persona Workflows */}
        <PersonasSection />

        {/* 9. Direct Comparison: Writerdost vs Generic AI vs Ghostwriters */}
        <ComparisonMatrix />

        {/* 10. Early Adopter Showcase (Real Beta Projects) */}
        <TestimonialsSection />

        {/* 11. Interactive Time & Cost Savings ROI Calculator */}
        <RoiCalculator />

        {/* 12. Standard Pricing & Limited-Time Founder Passes */}
        <PricingSection />

        {/* 13. Frequently Asked Questions Accordion */}
        <FaqSection />

        {/* 14. Final High-Conversion CTA */}
        <CtaBanner />
      </main>

      {/* Comprehensive Website Footer */}
      <WebsiteFooter />
    </div>
  );
}
