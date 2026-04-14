"use client";

import { useMemo, useState } from "react";
import type { Faq, Feature, Plan } from "@/components/home/content";
import { PricingCard } from "@/components/home/pricing-card";
import { OpsTabs } from "@/components/home/ops-tabs";

type LandingPageProps = {
  features: Feature[];
  plans: Plan[];
  faqs: Faq[];
};

const services = [
  "Android App",
  "Web App",
  "Cloud Support",
  "PG Listing",
  "Express Integration",
  "PG Cloud",
];

const stats = [
  { value: "900+", label: "Active PGs" },
  { value: "500+", label: "Active Clients" },
  { value: "10000+", label: "Inmates" },
];

const featureFilters = ["All", "Operations", "Billing", "Residents", "Admin"] as const;

type FeatureFilter = (typeof featureFilters)[number];

export function LandingPage({ features, plans }: LandingPageProps) {
  const [activeFilter, setActiveFilter] = useState<FeatureFilter>("All");

  const filteredFeatures = useMemo(() => {
    if (activeFilter === "All") {
      return features;
    }
    return features.filter((feature) => feature.category === activeFilter);
  }, [activeFilter, features]);

  return (
    <div className="min-h-screen [background:var(--color-page-gradient)] text-[var(--color-text-primary)]">
      <header className="mx-auto w-full max-w-[96rem] px-3 pt-6 sm:px-4 lg:px-6">
        <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-[color:var(--color-nav-border)] bg-[var(--color-surface-glass)] px-6 py-4 shadow-[var(--shadow-nav)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <img src="/brand/pg-logo.svg" alt="EasyPG" className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-[var(--color-text-title)]">EasyPG</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                PG Manager Suite
              </p>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-6 text-sm font-semibold text-[var(--color-text-muted)] md:flex">
            <a href="#services" className="cursor-pointer hover:text-[var(--color-text-primary)]">
              Services
            </a>
            <a href="#features" className="cursor-pointer hover:text-[var(--color-text-primary)]">
              Features
            </a>
            <a href="#demo" className="cursor-pointer hover:text-[var(--color-text-primary)]">
              Demo
            </a>
            <a href="#pricing" className="cursor-pointer hover:text-[var(--color-text-primary)]">
              Pricing
            </a>
            <a href="#contact" className="cursor-pointer hover:text-[var(--color-text-primary)]">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/login"
              className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
            >
              Login
            </a>
            <a
              href="/admin/signup"
              className="cursor-pointer rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-brand-hover)]"
            >
              Register
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[96rem] px-3 pb-24 pt-12 sm:px-4 lg:px-6">
        <section className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="absolute inset-0 bg-[url('/brand/hero.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-[rgba(14,10,12,0.58)]" />
            <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center text-[var(--color-text-inverse)] sm:px-10">
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                You think your PG is well managed?
                <span className="block text-[var(--color-brand)]">Think again!</span>
              </h1>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#services"
                  className="cursor-pointer rounded-2xl bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-brand-hover)]"
                >
                  Learn More
                </a>
                <a
                  href="#demo"
                  className="cursor-pointer rounded-2xl border border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.08)] px-6 py-3 text-sm font-bold text-[var(--color-text-inverse)] backdrop-blur transition hover:bg-[rgba(255,255,255,0.16)]"
                >
                  View Demo
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center"
              >
                <p className="text-2xl font-black text-[var(--color-text-title)]">{stat.value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand)]">
            Services
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)]"
              >
                <h3 className="text-lg font-extrabold text-[var(--color-text-primary)]">{service}</h3>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="pt-20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand)]">
              Features
            </p>
            <div className="flex flex-wrap gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1">
              {featureFilters.map((filter) => {
                const isActive = filter === activeFilter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                      isActive
                        ? "bg-[var(--color-brand)] text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)]"
              >
                <h3 className="text-lg font-extrabold text-[var(--color-text-primary)]">
                  {feature.title}
                </h3>
              </article>
            ))}
          </div>
        </section>

        <section id="demo" className="pt-20">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-emerald-soft),var(--color-surface))] px-6 py-10 text-[var(--color-text-primary)] sm:px-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-brand)]">
              Demo
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.youtube.com"
                className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-brand-hover)]"
              >
                View Demo
              </a>
              <a
                href="/admin/signup"
                className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
              >
                Start Trial
              </a>
            </div>
          </div>
        </section>

        <section id="pricing" className="pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand)]">
            Pricing
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </section>

        <section id="pg-cloud" className="pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand)]">
            PG Cloud
          </p>
          <div className="mt-8">
            <OpsTabs />
          </div>
        </section>

        <section id="contact" className="pt-20">
          <div className="rounded-3xl border border-[var(--color-border)] [background:linear-gradient(135deg,var(--color-footer-from),var(--color-footer-to))] px-6 py-8 text-[var(--color-text-inverse)] sm:px-9">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[rgba(255,255,255,0.7)]">
              Contact
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/admin/signup"
                className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-brand-hover)]"
              >
                Start Free
              </a>
              <a
                href="mailto:support@pgmanager.in"
                className="cursor-pointer rounded-xl border border-[rgba(255,255,255,0.45)] px-5 py-3 text-sm font-bold text-[rgba(255,255,255,0.95)] transition hover:bg-[rgba(255,255,255,0.15)]"
              >
                support@pgmanager.in
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-10 text-sm text-[var(--color-text-muted)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-[var(--color-text-secondary)]">EasyPG</p>
            <p>© 2026</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
