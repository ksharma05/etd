import Link from "next/link";

type CTASectionProps = {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  id?: string;
};

export function CTASection({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  id,
}: CTASectionProps) {
  return (
    <section
      id={id}
      className="mx-auto my-16 w-full max-w-7xl rounded-3xl bg-olive-950 px-6 py-12 text-white lg:px-10 dark:bg-olive-900"
    >
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-2xl text-olive-200">{description}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={primaryHref}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-olive-950 transition hover:bg-olive-100"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

