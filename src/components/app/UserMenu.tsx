"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";

export default function UserMenu({
  name,
  email,
  initials,
}: {
  name: string;
  email: string;
  initials: string;
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
          <MenuLink href="/dashboard" onClick={() => setOpen(false)}>Dashboard</MenuLink>
          <MenuLink href="/account" onClick={() => setOpen(false)}>Account</MenuLink>
          <MenuLink href="/account/profile" onClick={() => setOpen(false)}>Edit profile</MenuLink>
          <MenuLink href="/cohorts" onClick={() => setOpen(false)}>Cohorts</MenuLink>
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              Sign out
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
      className="block rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}
