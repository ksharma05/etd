import Link from "next/link";

import { company, navItems } from "@/lib/site-content";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-olive-200/70 py-10 dark:border-olive-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 lg:px-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-olive-950 dark:text-white">{company.name}</p>
            <p className="mt-1 text-sm text-olive-700 dark:text-olive-300">
              {company.legalBadge} · {company.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-olive-700 hover:underline dark:text-olive-300">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-xs text-olive-600 dark:text-olive-400">
          © {new Date().getFullYear()} {company.name}. Built for high-performance B2B growth.
        </p>
      </div>
    </footer>
  );
}

