import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerLinkLabel,
  footerHref,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden [background:var(--color-page-gradient)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-[rgba(198,0,61,0.22)] blur-[120px]" />
      <div className="pointer-events-none absolute right-10 top-20 h-56 w-56 rounded-full bg-[rgba(198,0,61,0.18)] blur-[110px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgba(198,0,61,0.12)] blur-[130px]" />

      <div className="relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">EasyPG Admin</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)] sm:text-base">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            {footerText}{" "}
            <Link href={footerHref} className="font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]">
              {footerLinkLabel}
            </Link>
          </p>
        </section>

        <aside className="relative overflow-hidden rounded-[32px] border border-[color:rgba(255,255,255,0.25)] bg-[linear-gradient(150deg,rgba(198,0,61,0.85),rgba(40,10,22,0.95))] p-6 text-[var(--color-text-inverse)] shadow-[var(--shadow-card)] sm:p-8">
          <div className="pointer-events-none absolute -right-20 top-4 h-48 w-48 rounded-full bg-[rgba(255,255,255,0.15)] blur-[80px]" />
          <div className="pointer-events-none absolute bottom-6 left-6 h-40 w-40 rounded-full bg-[rgba(255,255,255,0.1)] blur-[70px]" />

          <p className="text-xs font-black uppercase tracking-[0.16em] text-[rgba(255,255,255,0.75)]">Secure</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Admin Access</h2>

          <div className="mt-7 grid gap-3">
            {[
              { label: "Fast setup", value: "5 min" },
              { label: "Workflows", value: "50+" },
              { label: "Visibility", value: "Live" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.12)] p-4 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-[rgba(255,255,255,0.75)]">{item.label}</p>
                <p className="mt-1 text-lg font-black">{item.value}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
