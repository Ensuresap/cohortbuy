import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import * as repo from "../repositories/guideRepo";
import { SaveGuideInput, type PublicGuide, type GuideRow } from "../domain/guide";
import { GUIDES as FILE_GUIDES } from "@/content/guides";

function rowToPublic(r: GuideRow): PublicGuide {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    category: r.category ?? "Guide",
    readMins: r.read_mins,
    updated: (r.published_at ?? r.updated_at).slice(0, 10),
    body: r.body,
    source: "db",
  };
}

const fileGuides: PublicGuide[] = FILE_GUIDES.map((g) => ({
  slug: g.slug,
  title: g.title,
  description: g.description,
  category: g.category,
  readMins: g.readMins,
  updated: g.updated,
  body: g.body,
  source: "file",
}));

/** Published guides for the public hub — DB articles plus the built-in file ones. */
export async function listPublicGuides(ctx: Ctx): Promise<PublicGuide[]> {
  let dbGuides: PublicGuide[] = [];
  if (ctx.db) {
    const { data } = await repo.listPublished(ctx.db);
    dbGuides = ((data ?? []) as GuideRow[]).map(rowToPublic);
  }
  const dbSlugs = new Set(dbGuides.map((g) => g.slug));
  const merged = [...dbGuides, ...fileGuides.filter((g) => !dbSlugs.has(g.slug))];
  return merged.sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

/** A single published guide by slug (DB takes precedence over a file guide). */
export async function getPublicGuide(ctx: Ctx, slug: string): Promise<PublicGuide | null> {
  if (ctx.db) {
    const { data } = await repo.getBySlug(ctx.db, slug);
    if (data) return rowToPublic(data as GuideRow);
  }
  return fileGuides.find((g) => g.slug === slug) ?? null;
}

// ---- Admin authoring -------------------------------------------------------
export async function adminListGuides(ctx: Ctx): Promise<Result<GuideRow[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.adminList(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as GuideRow[]);
}

export async function adminGetGuide(ctx: Ctx, id: string): Promise<Result<GuideRow | null>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.adminGet(ctx.db, id);
  if (error) return err("db_error", error.message);
  return ok((data as GuideRow) ?? null);
}

export async function saveGuide(ctx: Ctx, raw: unknown): Promise<Result<{ id: string }>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SaveGuideInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Check the fields");
  const d = p.data;
  const row: Record<string, unknown> = {
    slug: d.slug,
    title: d.title,
    description: d.description ?? null,
    category: d.category ?? null,
    body: d.body,
    read_mins: d.readMins,
    status: d.status,
    updated_at: new Date().toISOString(),
  };
  if (d.status === "published") row.published_at = new Date().toISOString();

  if (d.id) {
    const { data, error } = await repo.updateGuide(ctx.db, d.id, row);
    if (error) return err("db_error", error.message);
    return ok({ id: (data as { id: string }).id });
  }
  row.author_id = ctx.actor.id;
  const { data, error } = await repo.insertGuide(ctx.db, row);
  if (error) {
    if ((error as { code?: string }).code === "23505") return err("invalid_input", "That slug is already taken");
    return err("db_error", error.message);
  }
  return ok({ id: (data as { id: string }).id });
}

export async function deleteGuide(ctx: Ctx, id: string): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.deleteGuide(ctx.db, id);
  if (error) return err("db_error", error.message);
  return ok(true);
}
