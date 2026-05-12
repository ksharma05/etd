import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CTASection, ConsultationBooking, Section } from "@/components/site";
import { company, services, type ServiceSlug } from "@/lib/site-content";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    return {
      title: "Service Not Found",
    };
  }

  return {
    title: service.title,
    description: service.shortDescription,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      title: `${service.title} | ${company.name}`,
      description: service.heroDescription,
      type: "article",
      url: `/services/${service.slug}`,
    },
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getService(slug as ServiceSlug);

  if (!service) {
    notFound();
  }

  return (
    <>
      <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive-700 dark:text-olive-300">Service</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-olive-950 sm:text-5xl dark:text-white">{service.title}</h1>
        <p className="mt-5 max-w-3xl text-lg text-olive-700 dark:text-olive-300">{service.heroDescription}</p>
      </section>

      <Section
        title="Expected outcomes"
        description="Each engagement is aligned to measurable business outcomes and practical execution milestones."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {service.outcomes.map((outcome) => (
            <article key={outcome} className="rounded-2xl border border-olive-300/70 bg-white/60 p-5 dark:border-olive-800 dark:bg-olive-900/40">
              <p className="text-sm text-olive-800 dark:text-olive-200">{outcome}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Delivery scope" description="A focused execution model designed for speed, clarity, and high-quality handoff.">
        <ul className="space-y-3">
          {service.deliverables.map((deliverable) => (
            <li key={deliverable} className="rounded-xl border border-olive-300/70 bg-white/70 px-4 py-3 text-sm text-olive-900 dark:border-olive-800 dark:bg-olive-900/40 dark:text-olive-100">
              {deliverable}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link href="/portfolio" className="text-sm font-semibold text-olive-900 hover:underline dark:text-olive-100">
            See portfolio highlights →
          </Link>
        </div>
      </Section>

      <CTASection
        title={`Plan your ${service.title.toLowerCase()} roadmap`}
        description="Book a free strategy call and we will outline scope, milestones, and budget-friendly options."
        primaryHref="#book-consultation"
        primaryLabel="Book Consultation"
      />

      <ConsultationBooking />
    </>
  );
}

