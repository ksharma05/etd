import type { CaseStudy } from "@/lib/site-content";

type GlassCaseCardProps = {
  study: CaseStudy;
};

export function GlassCaseCard({ study }: GlassCaseCardProps) {
  return (
    <article className="rounded-3xl border border-white/30 bg-white/25 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive-800 dark:text-olive-200">{study.sector}</p>
      <h3 className="mt-2 text-xl font-semibold text-olive-950 dark:text-white">{study.name}</h3>
      <p className="mt-3 text-sm text-olive-800 dark:text-olive-200">{study.summary}</p>
      <p className="mt-4 text-sm font-medium text-olive-900 dark:text-olive-100">{study.impact}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {study.stack.map((item) => (
          <span
            key={item}
            className="rounded-full border border-olive-400/60 bg-white/70 px-3 py-1 text-xs text-olive-900 dark:border-olive-700 dark:bg-olive-900/50 dark:text-olive-100"
          >
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

