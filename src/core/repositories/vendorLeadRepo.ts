import type { SupabaseClient } from "@supabase/supabase-js";
import type { VendorLeadInput } from "../domain/vendorLead";

export function insertLead(db: SupabaseClient, input: VendorLeadInput) {
  return db
    .from("vendor_leads")
    .insert({
      business: input.business,
      contact_name: input.contactName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      categories: input.categories ?? null,
      service_area: input.serviceArea ?? null,
      message: input.message ?? null,
      source: input.source,
    })
    .select()
    .single();
}
