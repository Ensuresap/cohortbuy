import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import { resolveModel } from "../../ai/services/aiConfigService";
import { runMessages, LlmConfigError, type LlmTool } from "../../ai/llm";

const BENCHMARK_TOOL: LlmTool = {
  name: "propose_benchmark",
  description: "Return an estimated typical total price range (in major currency units) for this group project.",
  input_schema: {
    type: "object",
    properties: {
      low: { type: "number", description: "Low end of the typical total price" },
      high: { type: "number", description: "High end of the typical total price" },
      currency: { type: "string", description: "ISO currency code, e.g. USD" },
      rationale: { type: "string", description: "One or two sentences on what drives the range and what to verify" },
    },
    required: ["low", "high", "currency"],
  },
};

const VENDORS_TOOL: LlmTool = {
  name: "propose_vendors",
  description: "Return a short list of named candidate vendors (actual businesses) worth researching for this project, local to the stated area.",
  input_schema: {
    type: "object",
    properties: {
      vendors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The actual business name (not a category)" },
            website: { type: "string", description: "Website or a Google Maps search URL for the business, if known" },
            address: { type: "string", description: "Business address or service area/locality, if known" },
            note: { type: "string", description: "Why it fits / what to verify" },
          },
          required: ["name"],
        },
      },
    },
    required: ["vendors"],
  },
};

function mapAiErr(e: unknown) {
  if (e instanceof LlmConfigError) return err("ai_unconfigured", "AI isn't configured yet — set an API key (see SETUP.md).");
  return err("ai_error", e instanceof Error ? e.message : "AI request failed");
}

export async function estimateBenchmark(
  ctx: Ctx,
  args: { cohortId: string; context: string }
): Promise<Result<{ low: number; high: number; currency: string; rationale: string }>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, { cohortId: args.cohortId });
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      system:
        "You estimate a realistic typical TOTAL price range for a neighbor group-buying project, to set expectations. Be honest and conservative; it's only a benchmark. Always call propose_benchmark.",
      messages: [{ role: "user", content: args.context }],
      tools: [BENCHMARK_TOOL],
    });
    if (r.kind !== "tool") return err("ai_error", "No estimate returned");
    const i = r.input as { low?: number; high?: number; currency?: string; rationale?: string };
    if (typeof i.low !== "number" || typeof i.high !== "number") return err("ai_error", "Incomplete estimate");
    return ok({ low: i.low, high: i.high, currency: i.currency || "USD", rationale: i.rationale || "" });
  } catch (e) {
    return mapAiErr(e);
  }
}

export async function suggestVendors(
  ctx: Ctx,
  args: { cohortId: string; context: string }
): Promise<Result<{ name: string; website: string; address: string; note: string }[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, { cohortId: args.cohortId });
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      system:
        "Suggest 3–5 ACTUAL named vendor businesses (not categories) that operate in or near the project's stated location and could do this work. Use the location to keep them local. Give the real business name and, if you know it, a website or a Google Maps search URL. These are leads to verify, not endorsements — note what to check. If you genuinely don't know real local businesses, give the best-known regional/national options and say so in the note. Always call propose_vendors.",
      messages: [{ role: "user", content: args.context }],
      tools: [VENDORS_TOOL],
    });
    if (r.kind !== "tool") return err("ai_error", "No suggestions returned");
    const list = (r.input as { vendors?: Array<{ name?: string; website?: string; address?: string; note?: string }> }).vendors ?? [];
    return ok(
      list.filter((v) => v.name).map((v) => ({ name: v.name as string, website: v.website ?? "", address: v.address ?? "", note: v.note ?? "" }))
    );
  } catch (e) {
    return mapAiErr(e);
  }
}
