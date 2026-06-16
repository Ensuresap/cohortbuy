import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "./UserMenu";
import Presence from "./Presence";

function initialsFrom(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

/** Authenticated app frame: top bar with nav + profile menu. */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profileRes = user
    ? await getMyProfile({ db: supabase, actor: { id: user.id } })
    : null;
  const profile = profileRes && profileRes.ok ? profileRes.data : null;

  const name = profile?.display_name ?? "You";
  const email = profile?.email ?? user?.email ?? "";
  const initials = initialsFrom(name);

  return (
    <div className="min-h-screen">
      <Presence />
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <circle cx="16" cy="16" r="15" fill="#1F6F5C" />
              <circle cx="12" cy="13" r="3.2" fill="#FBF7F0" />
              <circle cx="20" cy="13" r="3.2" fill="#E9B949" />
              <circle cx="16" cy="20" r="3.2" fill="#E07A5F" />
            </svg>
            <span className="font-display text-lg font-semibold text-primary">CohortBuy</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-primary sm:block"
            >
              Dashboard
            </Link>
            <Link
              href="/cohorts"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-primary sm:block"
            >
              Cohorts
            </Link>
            <ThemeToggle />
            <UserMenu name={name} email={email} initials={initials} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
