import type { SupabaseClient } from "@supabase/supabase-js";

export function insertCandidate(
  db: SupabaseClient,
  args: {
    requestId: string;
    name: string;
    contact?: string;
    website?: string;
    notes?: string;
    source: string;
    vendorId?: string;
    userId: string;
  }
) {
  return db.from("vendor_candidates").insert({
    request_id: args.requestId,
    vendor_id: args.vendorId ?? null,
    name: args.name,
    contact: args.contact ?? null,
    website: args.website ?? null,
    notes: args.notes ?? null,
    source: args.source,
    suggested_by: args.userId,
  });
}

export function listCandidates(db: SupabaseClient, requestId: string) {
  return db
    .from("vendor_candidates")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
}

export function setCandidateStatus(db: SupabaseClient, id: string, status: string) {
  return db.rpc("set_candidate_status", { p_id: id, p_status: status });
}

export function deleteCandidate(db: SupabaseClient, id: string) {
  return db.rpc("delete_candidate", { p_id: id });
}

export function setResearch(
  db: SupabaseClient,
  args: { requestId: string; lowCents: number; highCents: number; currency: string; notes: string }
) {
  return db.rpc("set_research", {
    p_request: args.requestId,
    p_low: args.lowCents,
    p_high: args.highCents,
    p_currency: args.currency,
    p_notes: args.notes,
  });
}

export function approveShortlist(db: SupabaseClient, requestId: string) {
  return db.rpc("approve_shortlist", { p_request: requestId });
}
