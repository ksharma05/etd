import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, eyebrow, title, description, children, className }: SectionProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 ${className ?? ""}`}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive-700 dark:text-olive-300">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-olive-950 sm:text-4xl dark:text-white">{title}</h2>
        {description ? <p className="mt-4 text-base text-olive-700 dark:text-olive-300">{description}</p> : null}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}

