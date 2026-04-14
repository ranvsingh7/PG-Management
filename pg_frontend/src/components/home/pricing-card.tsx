import type { Plan } from "@/components/home/content";

type PricingCardProps = {
  plan: Plan;
};

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <article
      className={`relative overflow-visible rounded-3xl border px-6 pb-6 pt-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pricing-hover)] ${
        plan.highlight
          ? "border-[var(--color-emerald)] [background:linear-gradient(160deg,var(--color-emerald-tint),var(--color-surface))] pt-9 shadow-[var(--shadow-pricing-highlight)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      {plan.highlight ? (
        <span className="absolute left-6 top-0 -translate-y-1/2 rounded-full bg-[var(--color-emerald)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-inverse)] shadow-[var(--shadow-badge)]">
          Most popular
        </span>
      ) : null}

      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
        {plan.name}
      </p>
      <p className="mt-4 text-4xl font-black leading-none text-[var(--color-text-title)]">{plan.price}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">{plan.period}</p>

      {plan.subtitle ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">{plan.subtitle}</p>
      ) : null}

      {plan.items.length > 0 ? (
        <ul className="mt-5 space-y-3 text-sm text-[var(--color-text-secondary)]">
          {plan.items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-emerald-soft)] text-xs font-black text-[var(--color-emerald-strong)]">
                +
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <a
        href="#"
        className={`cursor-pointer mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
          plan.highlight
            ? "bg-[var(--color-emerald)] text-[var(--color-text-inverse)] hover:bg-[var(--color-emerald-hover)]"
            : "bg-[var(--color-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-hover)]"
        }`}
      >
        {plan.cta}
      </a>
    </article>
  );
}
