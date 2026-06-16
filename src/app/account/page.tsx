import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import { getBalance } from "@/core/tokens/services/tokenService";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "./actions";

export default async function AccountPage() {
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
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-text">
          Hi, {profile.display_name}
        </h1>
        <form action={signOutAction}>
          <Button variant="secondary" type="submit">Sign out</Button>
        </form>
      </div>

      {/* Tokens */}
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

      {/* Profile */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm font-medium text-muted">Profile</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Row label="Email" value={profile.email ?? "—"} />
          <Row label="Phone" value={profile.phone ?? "Not set"} />
          <Row
            label="SMS alerts"
            value={profile.sms_opt_in ? "On" : "Off"}
          />
          <Row label="Preferred channel" value={profile.preferred_channel} />
          <Row label="Country" value={profile.country} />
          <Row label="Role" value={profile.role} />
        </dl>
      </div>
    </main>
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
