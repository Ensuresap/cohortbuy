import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddVendorInput } from "../domain/vendor";

export function insertVendor(db: SupabaseClient, input: AddVendorInput, userId: string) {
  return db.from("vendors").insert({
    name: input.name,
    website: input.website ?? null,
    contact_email: input.contactEmail ?? null,
    contact_phone: input.contactPhone ?? null,
    categories: input.categories,
    coverage_zips: input.coverageZips,
    notes: input.notes ?? null,
    vetting_status: input.vettingStatus,
    created_by: userId,
  });
}

export function listVendors(db: SupabaseClient) {
  return db.from("vendors").select("*").order("name", { ascending: true });
}

export function searchByCategory(db: SupabaseClient, category: string) {
  return db.from("vendors").select("*").contains("categories", [category]).order("name");
}
