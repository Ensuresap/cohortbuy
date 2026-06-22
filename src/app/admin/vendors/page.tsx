import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOverview } from "@/core/admin/services/adminService";
import { listVendors } from "@/core/vendors/services/vendorService";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field, Textarea, Select } from "@/components/ui/Field";
import CardTitle from "@/components/ui/CardTitle";
import { addVendorAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  // Staff gate (getOverview is staff-only).
  const ov = await getOverview(ctx);
  if (!ov.ok) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-md px-6 py-16 text-center">
          <Store className="mx-auto h-10 w-10 text-subtle" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-text">Vendor registry</h1>
          <p className="mt-2 text-muted">This area is for platform staff only.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">← Back</Link>
        </main>
      </AppShell>
    );
  }

  const vendorsRes = await listVendors(ctx);
  const vendors = vendorsRes.ok ? vendorsRes.data : [];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <Link href="/admin" className="text-sm text-subtle hover:text-primary">← Admin</Link>
        <div className="mt-2 flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-text">Vendor registry</h1>
        </div>
        <p className="mt-1 text-muted">Curated vendors that cohorts can shortlist during research.</p>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <CardTitle>Add a vendor</CardTitle>
          <form action={addVendorAction} className="mt-3 space-y-3">
            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" required placeholder="Apex Fencing" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Website" htmlFor="website" optional>
                <Input id="website" name="website" type="url" placeholder="https://…" />
              </Field>
              <Field label="Contact email" htmlFor="contactEmail" optional>
                <Input id="contactEmail" name="contactEmail" type="email" placeholder="hello@vendor.com" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact phone" htmlFor="contactPhone" optional>
                <Input id="contactPhone" name="contactPhone" placeholder="+1…" />
              </Field>
              <Field label="Vetting status" htmlFor="vettingStatus">
                <Select id="vettingStatus" name="vettingStatus" defaultValue="unverified">
                  <option value="unverified">Unverified</option>
                  <option value="vetted">Vetted</option>
                </Select>
              </Field>
            </div>
            <Field label="Categories" htmlFor="categories" optional hint="Comma-separated, e.g. Fencing, Decking">
              <Input id="categories" name="categories" placeholder="Fencing, Decking" />
            </Field>
            <Field label="Coverage ZIPs" htmlFor="coverageZips" optional hint="Comma-separated ZIP codes">
              <Input id="coverageZips" name="coverageZips" placeholder="78704, 78745" />
            </Field>
            <Field label="Notes" htmlFor="notes" optional>
              <Textarea id="notes" name="notes" rows={2} placeholder="Licence #, insurance, anything useful" />
            </Field>
            <Button type="submit">Add vendor</Button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <CardTitle>Registry ({vendors.length})</CardTitle>
          {vendors.length === 0 ? (
            <p className="mt-2 text-muted">No vendors yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {vendors.map((v) => (
                <li key={v.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text">
                      {v.website ? <a href={v.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{v.name}</a> : v.name}
                    </span>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (v.vetting_status === "vetted" ? "bg-primary/10 text-primary" : "bg-surface-2 text-subtle")}>
                      {v.vetting_status === "vetted" ? "Vetted" : "Unverified"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    {v.categories.length ? v.categories.join(", ") : "No categories"}
                    {v.coverage_zips.length ? ` · ${v.coverage_zips.length} ZIPs` : ""}
                    {v.contact_email ? ` · ${v.contact_email}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
