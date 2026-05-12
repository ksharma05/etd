import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site";
import { company } from "@/lib/site-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://exponenttechanddigital.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${company.name} | Development, Digital Media & Design`,
    template: `%s | ${company.name}`,
  },
  description:
    "Exponent Tech and Digital is an MSME-registered agency in Gurgaon delivering web development, digital media, and graphic design for B2B growth.",
  openGraph: {
    title: company.name,
    description:
      "MSME-registered Gurgaon agency for development, digital media, and design with fast consultation-first engagement.",
    type: "website",
    url: "/",
    locale: "en_IN",
    siteName: company.name,
  },
  twitter: {
    card: "summary_large_image",
    title: company.name,
    description: "High-performance web, media, and creative systems for B2B teams.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
