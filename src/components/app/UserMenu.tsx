"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { LayoutDashboard, UserRound, SquarePen, Users, LogOut, ShieldCheck } from "lucide-react";

export default function UserMenu({
  name,
  email,
  initials,
  isStaff = false,
}: {
  name: string;
  email: string;
  initials: string;
  isStaff?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-soft">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-text">{name}</p>
            <p className="truncate text-xs text-subtle">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
            <LayoutDashboard className="h-4 w-4 text-muted" /> Dashboard
          </MenuLink>
          <MenuLink href="/account" onClick={() => setOpen(false)}>
            <UserRound className="h-4 w-4 text-muted" /> Account
          </MenuLink>
          <MenuLink href="/account/profile" onClick={() => setOpen(false)}>
            <SquarePen className="h-4 w-4 text-muted" /> Edit profile
          </MenuLink>
          <MenuLink href="/cohorts" onClick={() => setOpen(false)}>
            <Users className="h-4 w-4 text-muted" /> Cohorts
          </MenuLink>
          {isStaff && (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              <ShieldCheck className="h-4 w-4 text-muted" /> Platform admin
            </MenuLink>
          )}
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              <LogOut className="h-4 w-4 text-muted" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}
