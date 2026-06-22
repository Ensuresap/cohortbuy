import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getOverview,
  getRecentProjects,
  getInactiveCohorts,
  getVendorLeads,
  getWaitlist,
} from "@/core/admin/services/adminService";
import { STAGE_LABELS, type RequestStatus } from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import MaskedValue from "@/components/app/MaskedValue";
import { getAuditLog } from "@/core/audit/services/auditService";

function fmt(cents: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}
function stageLabel(s: string) {
  return STAGE_LABELS[s as RequestStatus] ?? s;
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const ovRes = await getOverview(ctx);
  if (!ovRes.ok) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-md px-6 py-16 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-subtle" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-text">Admin</h1>
          <p className="mt-2 text-muted">
            {ovRes.error.code === "forbidden"
              ? "This area is for platform staff only."
              : ovRes.error.message}
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Back to dashboard
          </Link>
        </main>
      </AppShell>
    );
  }

  const ov = ovRes.data;
  const [projRes, inactiveRes, leadsRes, waitRes, auditRes] = await Promise.all([
    getRecentProjects(ctx, 12),
    getInactiveCohorts(ctx, 30),
    getVendorLeads(ctx, 50),
    getWaitlist(ctx, 100),
    getAuditLog(ctx, 40),
  ]);
  const projects = projRes.ok ? projRes.data : [];
  const inactive = inactiveRes.ok ? inactiveRes.data : [];
  const leads = leadsRes.ok ? leadsRes.data : [];
  const waitlist = waitRes.ok ? waitRes.data : [];
  const audit = auditRes.ok ? auditRes.data : [];
  const auditLabel = (a: string) =>
    ({ pii_reveal: "Revealed contact", data_export: "Exported own data", account_deletion: "Closed own account" } as Record<string, string>)[a] ?? a;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const stages = Object.entries(ov.by_stage).sort((a, b) => b[1] - a[1]);

  const cards = [
    { label: "Cohorts", value: ov.cohorts },
    { label: "Approved members", value: ov.members },
    { label: "Projects", value: ov.projects },
    { label: "Completed", value: ov.completed },
    { label: "Waitlist", value: ov.waitlist },
    { label: "Value coordinated", value: fmt(ov.value_cents) },
  ];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-text">Platform admin</h1>
        </div>
        <p className="mt-1 text-muted">
          Operations overview across all cohorts.{" "}
          <Link href="/admin/vendors" className="font-medium text-primary hover:underline">Vendor registry →</Link>{" "}
          <Link href="/admin/guides" className="font-medium text-primary hover:underline">Guides →</Link>
        </p>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <p className="text-xs text-subtle">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-text">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Recent projects */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft lg:col-span-2">
            <h2 className="font-display text-lg font-semibold text-text">Recent project activity</h2>
            {projects.length === 0 ? (
              <p className="mt-2 text-muted">No projects yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/requests/${p.id}`} className="truncate font-medium text-text hover:text-primary">
                        {p.title}
                      </Link>
                      <p className="text-xs text-subtle">
                        {p.cohort_name} · {p.participants} participant{p.participants === 1 ? "" : "s"}
                        {p.agreed_amount_cents != null
                          ? ` · ${fmt(p.agreed_amount_cents, p.agreed_currency ?? "USD")}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text">
                      {stageLabel(p.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Side: stage breakdown + inactivity */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="text-sm font-medium text-muted">Projects by stage</h2>
              {stages.length === 0 ? (
                <p className="mt-2 text-muted">—</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {stages.map(([s, n]) => (
                    <li key={s} className="flex items-center justify-between">
                      <span className="text-text">{stageLabel(s)}</span>
                      <span className="font-medium text-subtle">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="text-sm font-medium text-muted">Inactive cohorts (30d+)</h2>
              {inactive.length === 0 ? (
                <p className="mt-2 text-muted">All cohorts active recently.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {inactive.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <Link href={`/${c.handle}`} className="truncate text-text hover:text-primary">
                        {c.name}
                      </Link>
                      <span className="shrink-0 text-xs text-subtle">
                        {new Date(c.last_activity_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Inbox — inbound leads + waitlist */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-text">Vendor leads</h2>
              <span className="text-xs text-subtle">{leads.length}</span>
            </div>
            {leads.length === 0 ? (
              <p className="mt-2 text-muted">No vendor leads yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {leads.map((l) => (
                  <li key={l.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text">{l.business}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                          {l.contact_name ? <span>{l.contact_name} ·</span> : null}
                          <MaskedValue value={l.email} type="email" />
                          {l.phone ? <><span>·</span><MaskedValue value={l.phone} type="phone" /></> : null}
                        </p>
                        <p className="mt-0.5 text-xs text-subtle">
                          {[l.categories, l.service_area].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {l.message && <p className="mt-1 text-sm text-muted">{l.message}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-subtle">{fmtDate(l.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-text">Waitlist</h2>
              <span className="text-xs text-subtle">{waitlist.length}</span>
            </div>
            {waitlist.length === 0 ? (
              <p className="mt-2 text-muted">No signups yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {waitlist.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 text-sm">
                      <MaskedValue value={w.email} type="email" />
                      <p className="text-xs text-subtle">{w.zip ? `ZIP ${w.zip} · ` : ""}{w.source}</p>
                    </div>
                    <span className="shrink-0 text-xs text-subtle">{fmtDate(w.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Audit log — sensitive actions */}
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-text">Audit log</h2>
          {audit.length === 0 ? (
            <p className="mt-2 text-muted">No audited actions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-text">
                    <span className="font-medium">{a.actor_name ?? "Someone"}</span>
                    <span className="text-muted"> · {auditLabel(a.action)}</span>
                    {a.target_type ? <span className="text-subtle"> ({a.target_type})</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-subtle">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
