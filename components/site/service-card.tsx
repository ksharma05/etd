import Link from "next/link";

import type { Service } from "@/lib/site-content";

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="rounded-3xl border border-olive-300/70 bg-white/70 p-6 backdrop-blur dark:border-olive-800 dark:bg-olive-950/60">
      <h3 className="text-xl font-semibold text-olive-950 dark:text-white">{service.title}</h3>
      <p className="mt-3 text-sm text-olive-700 dark:text-olive-300">{service.shortDescription}</p>
      <ul className="mt-5 space-y-2 text-sm text-olive-800 dark:text-olive-200">
        {service.outcomes.slice(0, 2).map((outcome) => (
          <li key={outcome} className="flex items-start gap-2">
            <span className="mt-1 size-1.5 rounded-full bg-olive-600 dark:bg-olive-300" />
            <span>{outcome}</span>
          </li>
        ))}
      </ul>
      <Link
        href={`/services/${service.slug}`}
        className="mt-6 inline-flex items-center text-sm font-semibold text-olive-900 hover:underline dark:text-olive-100"
      >
        Explore {service.title}
      </Link>
    </article>
  );
}

