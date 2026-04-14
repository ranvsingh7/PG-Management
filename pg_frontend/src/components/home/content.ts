export type Feature = {
  title: string;
  description: string;
  category: "Operations" | "Billing" | "Residents" | "Admin";
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
  { title: "Manage PGs, Hostels, Apartments", description: "", category: "Operations" },
  { title: "Manage Inmates", description: "", category: "Residents" },
  { title: "Manage Staff", description: "", category: "Admin" },
  { title: "Availability Tracking", description: "", category: "Operations" },
  { title: "Expense Management", description: "", category: "Billing" },
  { title: "Smart Rent Collection", description: "", category: "Billing" },
  { title: "Rent Receipts", description: "", category: "Billing" },
  { title: "Reports", description: "", category: "Admin" },
  { title: "Bookings", description: "", category: "Operations" },
  { title: "Food Register", description: "", category: "Operations" },
  { title: "Issue Management", description: "", category: "Residents" },
  { title: "Profit and Loss", description: "", category: "Billing" },
];

export const plans: Plan[] = [
  {
    name: "Starter",
    price: "INR 0",
    period: "/ 3 months",
    subtitle: "",
    items: [],
    cta: "Start Trial",
    highlight: false,
  },
  {
    name: "Standard",
    price: "INR 3600",
    period: "/ PG / year",
    subtitle: "",
    items: [],
    cta: "Choose Standard",
    highlight: true,
  },
  {
    name: "Growth",
    price: "INR 30",
    period: "/ bed / year",
    subtitle: "",
    items: [],
    cta: "Choose Growth",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: " pricing",
    subtitle: "",
    items: [],
    cta: "Contact Sales",
    highlight: false,
  },
];

export const faqs: Faq[] = [];
