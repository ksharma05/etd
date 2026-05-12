import Link from "next/link";

export default function ServiceNotFound() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24 text-center lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olive-700 dark:text-olive-300">404</p>
      <h1 className="mt-4 text-3xl font-semibold text-olive-950 dark:text-white">Service page not found</h1>
      <p className="mt-4 text-olive-700 dark:text-olive-300">The service you requested is unavailable. Please select one of our active offerings.</p>
      <div className="mt-8">
        <Link
          href="/services/web-development"
          className="rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white hover:bg-olive-800 dark:bg-olive-200 dark:text-olive-950"
        >
          Go to Services
        </Link>
      </div>
    </section>
  );
}

