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
    <main className="min-h-screen [background:var(--color-page-gradient)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-sky)]">EasyPG Admin</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)] sm:text-base">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            {footerText}{" "}
            <Link href={footerHref} className="font-bold text-[var(--color-sky)] hover:text-[var(--color-sky-strong)]">
              {footerLinkLabel}
            </Link>
          </p>
        </section>

        <aside className="rounded-3xl border border-[var(--color-border)] [background:linear-gradient(150deg,var(--color-footer-from),var(--color-footer-to))] p-6 text-[var(--color-text-inverse)] shadow-[var(--shadow-card)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-emerald-soft)]">Secure Access</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Run your PG from one place.</h2>
          <p className="mt-3 text-sm text-[color:rgba(226,232,240,0.96)] sm:text-base">
            Onboard tenants, automate billing, and track occupancy with a single admin account.
          </p>

          <div className="mt-7 grid gap-3">
            <div className="rounded-2xl border border-[color:rgba(100,116,139,0.75)] bg-[color:rgba(15,23,42,0.35)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(148,163,184,1)]">Fast setup</p>
              <p className="mt-1 text-lg font-black">5 minutes</p>
            </div>
            <div className="rounded-2xl border border-[color:rgba(100,116,139,0.75)] bg-[color:rgba(15,23,42,0.35)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(148,163,184,1)]">Operational workflows</p>
              <p className="mt-1 text-lg font-black">50+ automations</p>
            </div>
            <div className="rounded-2xl border border-[color:rgba(100,116,139,0.75)] bg-[color:rgba(15,23,42,0.35)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(148,163,184,1)]">Real-time visibility</p>
              <p className="mt-1 text-lg font-black">Live dashboard</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
