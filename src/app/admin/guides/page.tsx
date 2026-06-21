import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListGuides } from "@/core/guides/services/guideService";
import AppShell from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const res = await adminListGuides(ctx);
  if (!res.ok) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-md px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-text">Guides</h1>
          <p className="mt-2 text-muted">{res.error.code === "forbidden" ? "Platform staff only." : res.error.message}</p>
          <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">← Admin</Link>
        </main>
      </AppShell>
    );
  }
  const guides = res.data;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">← Admin</Link>
            <h1 className="mt-1 font-display text-2xl font-semibold text-text">Guides</h1>
          </div>
          <Link href="/admin/guides/editor" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">New article</Link>
        </div>

        <p className="mt-3 text-sm text-subtle">Articles authored here are published to <Link href="/guides" className="text-primary hover:underline">/guides</Link>. The built-in starter guides live in code and aren&rsquo;t listed here.</p>

        {guides.length === 0 ? (
          <p className="mt-8 text-muted">No articles yet. Create your first one.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {guides.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{g.title}</p>
                  <p className="truncate text-xs text-subtle">/guides/{g.slug} · {g.category ?? "—"} · updated {new Date(g.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (g.status === "published" ? "bg-primary/10 text-primary" : "bg-surface-2 text-subtle")}>
                    {g.status}
                  </span>
                  <Link href={`/admin/guides/editor?id=${g.id}`} className="text-sm font-medium text-primary hover:underline">Edit</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
