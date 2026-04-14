import type { Faq, Feature, Plan } from "@/components/home/content";
import { PricingCard } from "@/components/home/pricing-card";

type LandingPageProps = {
  features: Feature[];
  plans: Plan[];
  faqs: Faq[];
};

export function LandingPage({ features, plans, faqs }: LandingPageProps) {
  return (
    <div className="min-h-screen [background:var(--color-page-gradient)] text-[var(--color-text-primary)]">
      <header className="mx-auto w-full max-w-[96rem] px-3 pt-6 sm:px-4 lg:px-6">
        <div className="mb-4 inline-flex rounded-full border border-[color:var(--color-amber-soft)] bg-[var(--color-amber-soft)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber)]">
          Now live: smart PG operations
        </div>
        <nav className="rounded-2xl border border-[color:var(--color-nav-border)] bg-[color:rgba(255,255,255,0.75)] px-5 py-4 shadow-[var(--shadow-nav)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              EasyPG
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] sm:gap-5">
              <a href="#features" className="cursor-pointer hover:text-[var(--color-text-primary)]">
                Features
              </a>
              <a href="#pricing" className="cursor-pointer hover:text-[var(--color-text-primary)]">
                Pricing
              </a>
              <a href="#faq" className="cursor-pointer hover:text-[var(--color-text-primary)]">
                FAQ
              </a>
              <a href="#contact" className="cursor-pointer hover:text-[var(--color-text-primary)]">
                Contact
              </a>
            </div>
            <a
              href="/admin/signup"
              className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-brand-hover)]"
            >
              Start Free
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[96rem] px-3 pb-24 pt-10 sm:px-4 lg:px-6">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full bg-[var(--color-sky-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
              Smart PG and hostel management
            </p>
            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-[var(--color-text-title)] sm:text-5xl">
              Manage tenants, billing, and occupancy with one clear dashboard.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
              Built for Indian PG owners who need transparent pricing and a
              practical workflow from onboarding to checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/admin/signup"
                className="cursor-pointer rounded-xl bg-[var(--color-emerald)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
              >
                Start Free - No Card Needed
              </a>
              <a
                href="/admin/login"
                className="cursor-pointer rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)]"
              >
                Admin Login
              </a>
              <a
                href="#pricing"
                className="cursor-pointer rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)]"
              >
                View Pricing
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[var(--color-text-muted)]">
              <span>5 min setup</span>
              <span>24/7 access</span>
              <span>50+ workflows</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--color-card-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Live Snapshot</h2>
              <span className="rounded-full bg-[var(--color-emerald-soft)] px-2 py-1 text-xs font-bold text-[var(--color-emerald-strong)]">
                Healthy
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--color-dark-panel)] p-4 text-[var(--color-text-inverse)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                    Occupancy
                  </p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgba(148,163,184,0.18)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path
                        d="M3 20V10.5L12 4l9 6.5V20h-6.5v-6h-5v6H3Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black">92%</p>
              </div>
              <div className="rounded-2xl bg-[var(--color-amber-soft)] p-4 text-[var(--color-text-primary)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-amber)]">
                    Monthly Revenue
                  </p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgba(180,83,9,0.16)] text-[var(--color-amber)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path
                        d="M4 17.5h16M6.5 14.5V9.8c0-1.6 1.3-2.8 2.8-2.8h5.4c1.6 0 2.8 1.3 2.8 2.8v4.7M4.5 7h15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black">INR 8.4L</p>
              </div>
              <div className="rounded-2xl bg-[var(--color-sky-soft)] p-4 text-[var(--color-text-primary)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-sky)]">
                    Pending Payments
                  </p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgba(2,132,199,0.14)] text-[var(--color-sky)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path
                        d="M12 6v6l3.5 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black">17</p>
              </div>
              <div className="rounded-2xl bg-[var(--color-emerald-soft)] p-4 text-[var(--color-text-primary)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-emerald-strong)]">
                    New Joinings
                  </p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:rgba(4,120,87,0.14)] text-[var(--color-emerald-strong)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path
                        d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 1 1 14 0M19 8v4M21 10h-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black">26</p>
              </div>
            </div>
          </div>
      </section>

      <section id="features" className="pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-sky)]">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
            Everything you need to run your PG
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)]"
              >
                <h3 className="text-lg font-extrabold text-[var(--color-text-primary)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
      </section>

      <section id="pricing" className="pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-emerald-strong)]">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--color-text-muted)]">
            Pay only for what you use. No setup fees, no hidden clauses.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
      </section>

      <section id="faq" className="pt-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--color-amber)]">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="cursor-pointer group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <summary className="cursor-pointer list-none pr-8 text-base font-bold text-[var(--color-text-primary)]">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{item.a}</p>
              </details>
            ))}
          </div>
      </section>

      <section id="contact" className="pt-20">
          <div className="rounded-3xl border border-[var(--color-border)] [background:linear-gradient(135deg,var(--color-footer-from),var(--color-footer-to))] px-6 py-8 text-[var(--color-text-inverse)] sm:px-9">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-emerald-soft)]">
              Get in touch
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Ready to transform your PG management?
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[color:rgba(226,232,240,0.95)] sm:text-base">
              Join hundreds of PG owners already using EasyPG to streamline
              operations and grow revenue.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/admin/signup"
                className="cursor-pointer rounded-xl bg-[var(--color-emerald-hover)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-emerald)]"
              >
                Start Free Today
              </a>
              <a
                href="mailto:support@easypg.app"
                className="cursor-pointer rounded-xl border border-[color:rgba(100,116,139,0.9)] px-5 py-3 text-sm font-bold text-[color:rgba(241,245,249,0.95)] transition hover:bg-[var(--color-brand-hover)]"
              >
                support@easypg.app
              </a>
            </div>
          </div>
      </section>

      <footer className="border-t border-[var(--color-border)] pt-10 text-sm text-[var(--color-text-muted)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-[var(--color-text-secondary)]">
              EasyPG - Smart PG and hostel management made simple
            </p>
            <p>Copyright 2026 EasyPG. All rights reserved.</p>
          </div>
      </footer>
      </main>
    </div>
  );
}
