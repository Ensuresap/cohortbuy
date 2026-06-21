import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import { getBalance } from "@/core/tokens/services/tokenService";
import AppShell from "@/components/app/AppShell";
import { deleteAccountAction } from "./actions";

export default async function AccountPage({ searchParams }: { searchParams?: { delete?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = { db: supabase, actor: { id: user.id } };
  const profileRes = await getMyProfile(ctx);
  const profile = profileRes.ok ? profileRes.data : null;
  if (!profile?.display_name) redirect("/onboarding");

  const balanceRes = await getBalance(ctx, { userId: user.id });
  const tokens = balanceRes.ok
    ? balanceRes.data
    : { balance: 0, lifetimeEarned: 0, tier: "Newcomer" };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-text">
            Hi, {profile.display_name}
          </h1>
          <Link
            href="/account/profile"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-2"
          >
            Edit profile
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <p className="text-sm font-medium text-muted">CohortBuy tokens</p>
          <div className="mt-1 flex items-end gap-3">
            <span className="font-display text-4xl font-semibold text-primary">
              {tokens.balance}
            </span>
            <span className="mb-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text">
              {tokens.tier}
            </span>
          </div>
          <p className="mt-1 text-xs text-subtle">
            {tokens.lifetimeEarned} earned all-time · perks only, no cash value
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-muted">Profile</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Row label="Email" value={profile.email ?? "—"} />
            <Row label="Phone" value={profile.phone ?? "Not set"} />
            <Row label="SMS alerts" value={profile.sms_opt_in ? "On" : "Off"} />
            <Row label="Preferred channel" value={profile.preferred_channel} />
            <Row label="Country" value={profile.country} />
            <Row label="Role" value={profile.role} />
          </dl>
        </div>

        {/* Privacy & your data */}
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-muted">Privacy &amp; your data</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-text">Download your data</p>
              <p className="text-sm text-muted">A JSON copy of your profile, projects, scope, orders and tokens.</p>
            </div>
            <a href="/api/account/export" className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">
              Download
            </a>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="font-medium text-text">Delete your account</p>
            <p className="text-sm text-muted">
              Removes your personal details (name, email, phone) and closes your account. Your shared project records are anonymized so other members&rsquo; data stays intact.
            </p>
            {searchParams?.delete === "reassign" && (
              <p className="mt-2 text-sm font-medium text-accent">Hand off or finish the projects you coordinate before deleting your account.</p>
            )}
            {searchParams?.delete === "error" && (
              <p className="mt-2 text-sm font-medium text-accent">Something went wrong. Please try again.</p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-accent hover:underline">Delete my account</summary>
              <form action={deleteAccountAction} className="mt-3 space-y-2">
                <label className="block text-sm text-muted">Type <span className="font-semibold text-text">DELETE</span> to confirm:</label>
                <input name="confirm" placeholder="DELETE" className="h-10 w-48 rounded-xl border border-border bg-surface px-3 text-text outline-none focus:ring-2 focus:ring-ring" />
                <div>
                  <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    Permanently close my account
                  </button>
                </div>
              </form>
            </details>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-0.5 text-text">{value}</dd>
    </div>
  );
}
