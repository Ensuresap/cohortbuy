import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminGetGuide } from "@/core/guides/services/guideService";
import AppShell from "@/components/app/AppShell";
import GuideEditor from "@/components/app/GuideEditor";
import { deleteGuideAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function GuideEditorPage(props: { searchParams?: Promise<{ id?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const id = searchParams?.id;
  let initial: { slug: string; title: string; description: string; category: string; body: string; readMins: number; status: "draft" | "published" } = {
    slug: "", title: "", description: "", category: "", body: "", readMins: 4, status: "draft",
  };
  if (id) {
    const res = await adminGetGuide(ctx, id);
    if (!res.ok) {
      return (
        <AppShell>
          <main className="mx-auto w-full max-w-md px-6 py-16 text-center">
            <p className="text-muted">{res.error.code === "forbidden" ? "Platform staff only." : res.error.message}</p>
            <Link href="/admin/guides" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">← Guides</Link>
          </main>
        </AppShell>
      );
    }
    const g = res.data;
    if (g) {
      initial = {
        slug: g.slug, title: g.title, description: g.description ?? "", category: g.category ?? "",
        body: g.body, readMins: g.read_mins, status: g.status,
      };
    }
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/guides" className="text-sm font-medium text-primary hover:underline">← Guides</Link>
            <h1 className="mt-1 font-display text-2xl font-semibold text-text">{id ? "Edit article" : "New article"}</h1>
          </div>
          {id && (
            <form action={deleteGuideAction}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="text-sm font-medium text-accent hover:underline">Delete</button>
            </form>
          )}
        </div>
        <div className="mt-6">
          <GuideEditor initial={{ ...initial, id }} error={searchParams?.error} />
        </div>
      </main>
    </AppShell>
  );
}
