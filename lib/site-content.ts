export type ServiceSlug = "web-development" | "digital-media" | "graphic-design";

export type NavItem = {
  label: string;
  href: string;
};

export type Service = {
  slug: ServiceSlug;
  title: string;
  shortDescription: string;
  heroDescription: string;
  outcomes: string[];
  deliverables: string[];
};

export type CaseStudy = {
  name: string;
  sector: string;
  summary: string;
  impact: string;
  stack: string[];
};

export const company = {
  name: "Exponent Tech and Digital",
  legalBadge: "MSME Registered",
  city: "Gurgaon, India",
  description:
    "We build business-first digital products and media experiences that convert attention into measurable growth.",
  email: "hello@exponenttechanddigital.com",
};

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services/web-development" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Book Consultation", href: "#book-consultation" },
];

export const services: Service[] = [
  {
    slug: "web-development",
    title: "Web Development",
    shortDescription: "Scalable web apps, portals, and automation stacks for B2B operations.",
    heroDescription:
      "From high-performance marketing websites to internal ops platforms, we architect and ship products aligned to revenue goals.",
    outcomes: [
      "Faster launch cycles with modern app architecture",
      "Conversion-focused UX and technical SEO",
      "Maintainable codebases ready for scale",
    ],
    deliverables: [
      "Discovery and technical blueprint",
      "UI implementation with strict TypeScript",
      "API integrations and deployment pipeline",
    ],
  },
  {
    slug: "digital-media",
    title: "Digital Media",
    shortDescription: "Campaign strategy, content systems, and growth loops for digital channels.",
    heroDescription:
      "We design media systems that combine storytelling with performance data, helping teams grow qualified demand predictably.",
    outcomes: [
      "Clear channel strategy aligned with sales funnel stages",
      "Consistent creative output with better ROI tracking",
      "Improved lead quality through targeted distribution",
    ],
    deliverables: [
      "Campaign planning and content calendar",
      "Ad creatives and performance dashboards",
      "Monthly optimization and reporting",
    ],
  },
  {
    slug: "graphic-design",
    title: "Graphic Design",
    shortDescription: "Brand systems, visual identity, and high-conversion creative assets.",
    heroDescription:
      "We craft modern brand visuals and communication assets that make your business look credible, clear, and memorable.",
    outcomes: [
      "Unified brand language across digital touchpoints",
      "Higher engagement from strong visual storytelling",
      "Faster design-to-deployment handoff",
    ],
    deliverables: [
      "Brand style and visual direction",
      "Social, pitch, and campaign design kits",
      "Landing-page and product creative assets",
    ],
  },
];

export const valueProps = [
  "MSME-registered Indian firm with enterprise-grade execution",
  "Product, design, and media expertise in one integrated team",
  "Outcome-driven delivery with transparent communication",
];

export const caseStudies: CaseStudy[] = [
  {
    name: "B2B Hiring Platform Revamp",
    sector: "HR Tech",
    summary: "Rebuilt a legacy client portal into a modern acquisition engine with role-based workflows.",
    impact: "42% increase in qualified demo requests within 90 days.",
    stack: ["Next.js", "TypeScript", "Tailwind", "Analytics"],
  },
  {
    name: "Regional Retail Media Acceleration",
    sector: "Retail",
    summary: "Designed a digital media sprint system to launch weekly content and paid experiments.",
    impact: "3.1x growth in inbound leads while lowering blended CPL.",
    stack: ["Meta Ads", "Creative Ops", "Landing Pages"],
  },
  {
    name: "Brand Refresh for SaaS Consultancy",
    sector: "B2B Services",
    summary: "Created a new brand language with conversion-focused website pages and sales collateral.",
    impact: "Improved proposal close rate from 18% to 29%.",
    stack: ["Brand System", "UI Design", "Web Content"],
  },
];

