import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import {
  AddCandidateInput,
  SetCandidateStatusInput,
  SetResearchInput,
  type VendorCandidate,
} from "../domain/research";
import * as repo from "../repositories/researchRepo";

export async function listCandidates(ctx: Ctx, requestId: string): Promise<Result<VendorCandidate[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listCandidates(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as VendorCandidate[]);
}

export async function addCandidate(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = AddCandidateInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.insertCandidate(ctx.db, {
    requestId: p.data.requestId,
    name: p.data.name,
    contact: p.data.contact,
    website: p.data.website,
    address: p.data.address,
    notes: p.data.notes,
    source: p.data.source,
    vendorId: p.data.vendorId,
    userId: ctx.actor.id,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function setCandidateStatus(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetCandidateStatusInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid status");
  const { error } = await repo.setCandidateStatus(ctx.db, p.data.id, p.data.status);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "You can't change this vendor");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function deleteCandidate(ctx: Ctx, id: string): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.deleteCandidate(ctx.db, id);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "You can't remove this vendor");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function setResearch(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetResearchInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.setResearch(ctx.db, {
    requestId: p.data.requestId,
    lowCents: Math.round(p.data.low * 100),
    highCents: Math.round(p.data.high * 100),
    currency: p.data.currency.toUpperCase(),
    notes: p.data.notes ?? "",
  });
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can set the benchmark");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function setBenchmark(
  ctx: Ctx,
  args: { requestId: string; lowCents: number; highCents: number; currency: string; basis: string }
): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.setBenchmark(ctx.db, args);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can set the benchmark");
    return err("db_error", error.message);
  }
  return ok(true);
}

export interface RegistryVendor {
  id: string;
  name: string;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  vetting_status: string;
}

export async function listRegistryVendors(ctx: Ctx): Promise<Result<RegistryVendor[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listRegistryVendors(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as RegistryVendor[]);
}

/** Add a registry vendor to a project as a supplier candidate. */
export async function addRegistryCandidate(ctx: Ctx, args: { requestId: string; vendorId: string }): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data: v, error: vErr } = await repo.getRegistryVendor(ctx.db, args.vendorId);
  if (vErr) return err("db_error", vErr.message);
  if (!v) return err("not_found", "Vendor not found");
  const vendor = v as { id: string; name: string; website: string | null; contact_email: string | null; contact_phone: string | null };
  const { error } = await repo.insertCandidate(ctx.db, {
    requestId: args.requestId,
    name: vendor.name,
    website: vendor.website ?? undefined,
    contact: vendor.contact_email ?? vendor.contact_phone ?? undefined,
    source: "registry",
    vendorId: vendor.id,
    userId: ctx.actor.id,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function setProductInfo(
  ctx: Ctx,
  args: { requestId: string; name: string; url: string; specs: string; imageUrl: string }
): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.setProductInfo(ctx.db, args);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can set product details");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function approveShortlist(ctx: Ctx, requestId: string): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.approveShortlist(ctx.db, requestId);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can approve the shortlist");
    if (error.message?.includes("no_shortlist")) return err("invalid_input", "Shortlist at least one vendor first");
    return err("db_error", error.message);
  }
  return ok(true);
}
