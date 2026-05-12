import Link from "next/link";

import { CTASection, ConsultationBooking, Section, ServiceCard } from "@/components/site";
import { company, services, valueProps } from "@/lib/site-content";

const kineticWords = ["Build", "Scale", "Convert"];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(115,132,95,0.20),_transparent_50%)]" />
        <div className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <p className="inline-flex rounded-full border border-olive-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-olive-800 dark:border-olive-700 dark:bg-olive-900/60 dark:text-olive-200">
            {company.legalBadge} · {company.city}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-olive-950 sm:text-5xl lg:text-6xl dark:text-white">
            <span className="block">Modern digital systems that help B2B teams</span>
            <span className="mt-2 block">
              {kineticWords.map((word, index) => (
                <span
                  key={word}
                  className="mr-3 inline-block animate-pulse"
                  style={{ animationDelay: `${index * 0.3}s`, animationDuration: "2.5s" }}
                >
                  {word}
                </span>
              ))}
              with confidence.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-olive-700 dark:text-olive-300">{company.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#book-consultation"
              className="rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white hover:bg-olive-800 dark:bg-olive-200 dark:text-olive-950"
            >
              Book Free Consultation
            </Link>
            <Link
              href="/portfolio"
              className="rounded-full border border-olive-300 px-5 py-3 text-sm font-semibold text-olive-900 hover:bg-olive-200/50 dark:border-olive-700 dark:text-olive-100 dark:hover:bg-olive-800/50"
            >
              View Case Studies
            </Link>
          </div>
        </div>
      </section>

      <Section
        id="about"
        eyebrow="About Exponent"
        title="Built in Gurgaon, aligned with global delivery standards."
        description="As an MSME-registered company, we combine local reliability with modern engineering and creative execution."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => (
            <article key={item} className="rounded-2xl border border-olive-300/70 bg-white/60 p-5 dark:border-olive-800 dark:bg-olive-900/40">
              <p className="text-sm text-olive-800 dark:text-olive-200">{item}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="services"
        eyebrow="Core Services"
        title="Development, media, and design under one delivery stack."
        description="Choose a focused service line or combine all three for an integrated growth program."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </Section>

      <CTASection
        title="Start with a zero-cost consultation"
        description="Tell us your goals, timeline, and constraints. We will return a clear roadmap and delivery estimate."
        primaryHref="#book-consultation"
        primaryLabel="Book Consultation"
        secondaryHref="/services/web-development"
        secondaryLabel="Explore Services"
      />

      <ConsultationBooking />
    </>
  );
}
