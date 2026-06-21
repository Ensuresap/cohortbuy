"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, User } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/cohorts", label: "Cohorts", icon: Users },
  { href: "/cohorts/new", label: "Create", icon: Plus },
  { href: "/account", label: "Account", icon: User },
];

/** App-like bottom tab bar — mobile only. */
export default function MobileTabBar() {
  const path = usePathname() || "";
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? path === "/dashboard" : path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={"flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition " + (active ? "text-primary" : "text-subtle")}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
