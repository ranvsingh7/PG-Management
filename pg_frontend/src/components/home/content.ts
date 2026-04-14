export type Feature = {
  title: string;
  description: string;
};

export type Plan = {
  name: string;
  price: string;
  period: string;
  subtitle: string;
  items: string[];
  cta: string;
  highlight: boolean;
};

export type Faq = {
  q: string;
  a: string;
};

export const features: Feature[] = [
  {
    title: "Multi-Building Management",
    description: "Control all your PG properties from one unified dashboard.",
  },
  {
    title: "Tenant Lifecycle",
    description:
      "Handle onboarding, room assignment, renewals, and checkout in minutes.",
  },
  {
    title: "Automated Billing",
    description:
      "Generate invoices, track dues, and send payment reminders automatically.",
  },
  {
    title: "Real-time Analytics",
    description:
      "Monitor occupancy, revenue, and monthly growth with live insights.",
  },
  {
    title: "Secure + Reliable",
    description:
      "Built with enterprise-grade security, backups, and stable uptime.",
  },
  {
    title: "Fast Experience",
    description:
      "A smooth app experience for owners, admins, and residents on any device.",
  },
];

export const plans: Plan[] = [
  {
    name: "Free",
    price: "INR 0",
    period: "/ forever",
    subtitle: "Great for getting started",
    items: [
      "Up to 50 tenants",
      "Up to 2 buildings",
      "2 admin users",
      "All core features",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Professional",
    price: "INR 10",
    period: "/ bed / month",
    subtitle: "For growing PG operations",
    items: [
      "51-300 tenants",
      "Up to 10 buildings",
      "5 admin users",
      "Advanced analytics",
    ],
    cta: "Start Professional",
    highlight: true,
  },
  {
    name: "Business",
    price: "INR 8",
    period: "/ bed / month",
    subtitle: "For medium-large chains",
    items: [
      "301-900 tenants",
      "Up to 50 buildings",
      "10 admin users",
      "Custom workflows",
    ],
    cta: "Start Business",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: " pricing",
    subtitle: "For large-scale operations",
    items: [
      "Unlimited tenants",
      "Unlimited buildings",
      "Unlimited admins",
      "24/7 dedicated support",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export const faqs: Faq[] = [
  {
    q: "How does the free tier work?",
    a: "You can use core features forever for up to 50 tenants and 2 buildings, with no card required.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade, downgrade, or cancel anytime with no lock-in contracts.",
  },
  {
    q: "How is billing calculated?",
    a: "Paid plans are charged per bed per month based on your active tenant count.",
  },
  {
    q: "Is my data secure?",
    a: "Your data is encrypted at rest and in transit, with regular backups and strict access controls.",
  },
];
