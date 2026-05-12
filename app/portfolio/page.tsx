import type { Metadata } from "next";

import { CTASection, GlassCaseCard, Section } from "@/components/site";
import { caseStudies } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Case studies from web development, digital media, and design engagements.",
  alternates: {
    canonical: "/portfolio",
  },
};

export default function PortfolioPage() {
  return (
    <>
      <Section
        eyebrow="Selected Work"
        title="Case studies focused on measurable business outcomes."
        description="A snapshot of the product, growth, and brand execution we deliver for B2B clients."
        className="pt-20"
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {caseStudies.map((study) => (
            <GlassCaseCard key={study.name} study={study} />
          ))}
        </div>
      </Section>

      <CTASection
        title="Want similar outcomes for your business?"
        description="Book a no-cost consultation to evaluate your funnel, product surface, and creative opportunities."
        primaryHref="#book-consultation"
        primaryLabel="Book Consultation"
      />
    </>
  );
}

