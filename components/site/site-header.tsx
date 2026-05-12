import Link from "next/link";

import { company, navItems } from "@/lib/site-content";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-olive-200/70 bg-olive-100/90 backdrop-blur dark:border-olive-900 dark:bg-olive-950/85">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href="/" className="text-sm font-semibold tracking-wide text-olive-950 dark:text-white">
          {company.name}
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-olive-800 hover:underline dark:text-olive-200">
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          href="#book-consultation"
          className="rounded-full bg-olive-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-olive-800 dark:bg-olive-200 dark:text-olive-950"
        >
          Free Consultation
        </Link>
      </nav>
    </header>
  );
}

