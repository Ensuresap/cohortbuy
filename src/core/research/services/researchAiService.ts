import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import { resolveModel } from "../../ai/services/aiConfigService";
import { runMessages, LlmConfigError, type LlmTool } from "../../ai/llm";

const BENCHMARK_TOOL: LlmTool = {
  name: "propose_benchmark",
  description: "Return an estimated typical total price range (in major currency units) for this group project, with the criteria/assumptions used.",
  input_schema: {
    type: "object",
    properties: {
      low: { type: "number", description: "Low end of the typical total price" },
      high: { type: "number", description: "High end of the typical total price" },
      currency: { type: "string", description: "ISO currency code, e.g. USD" },
      assumptions: {
        type: "array",
        description: "The specific criteria the estimate is based on, e.g. for a fence: '≈120 ft of cedar privacy fence', '6 ft height', 'includes removal/haul-away', 'standard install, level ground'. Be concrete with the dimensions, material, and scope you assumed.",
        items: { type: "string" },
      },
      rationale: { type: "string", description: "One short sentence on what most drives the range and what to verify" },
    },
    required: ["low", "high", "currency", "assumptions"],
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

const RFQ_TOOL: LlmTool = {
  name: "propose_rfq",
  description: "Return a ready-to-send Request for Quote message addressed to vendors.",
  input_schema: {
    type: "object",
    properties: {
      body: {
        type: "string",
        description:
          "A complete, polite RFQ the coordinator can paste into an email or message. Include: who we are (a neighbor group buying together), the work/scope, that several nearby homes are doing it together (bulk opportunity), what we need quoted (itemized price, timeline, warranty, licence/insurance), and a request to reply by a reasonable date. Keep it professional and concise.",
      },
    },
    required: ["body"],
  },
};

export async function draftRfq(
  ctx: Ctx,
  args: { cohortId: string; context: string }
): Promise<Result<string>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, { cohortId: args.cohortId });
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      maxTokens: 1200,
      system:
        "You draft a standardized Request for Quote that a neighborhood group coordinator will send to vendors to collect bids for a shared project. Be clear and professional; emphasize the bulk/group opportunity. Always call propose_rfq.",
      messages: [{ role: "user", content: args.context }],
      tools: [RFQ_TOOL],
    });
    if (r.kind !== "tool") return err("ai_error", "No draft returned");
    const body = (r.input as { body?: string }).body;
    if (!body) return err("ai_error", "Empty draft");
    return ok(body);
  } catch (e) {
    return mapAiErr(e);
  }
}

const EXTRACT_QUOTE_TOOL: LlmTool = {
  name: "propose_quote",
  description: "Extract a vendor's quote from the supplied text (an email or quote document).",
  input_schema: {
    type: "object",
    properties: {
      vendorName: { type: "string", description: "The vendor / business name" },
      amount: { type: "number", description: "Total quoted price as a number in major currency units (e.g. dollars)" },
      currency: { type: "string", description: "ISO currency code, e.g. USD" },
      timeline: { type: "string", description: "Stated timeline / lead time, if any" },
      warranty: { type: "string", description: "Stated warranty, if any" },
      notes: { type: "string", description: "Key inclusions, exclusions or caveats, brief" },
      kind: { type: "string", enum: ["indicative", "final"], description: "'final' if it's a firm/site-visited quote, else 'indicative'" },
    },
    required: ["vendorName"],
  },
};

export interface ExtractedQuote {
  vendorName: string;
  amount: number | null;
  currency: string;
  timeline: string;
  warranty: string;
  notes: string;
  kind: "indicative" | "final";
}

export async function extractQuote(ctx: Ctx, args: { text: string }): Promise<Result<ExtractedQuote>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, {});
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      system:
        "Extract the vendor's quote details from the text (a vendor email or quote document). Return the total price as a number in major currency units. Leave fields empty if not present — do not invent values. Always call propose_quote.",
      messages: [{ role: "user", content: args.text.slice(0, 12000) }],
      tools: [EXTRACT_QUOTE_TOOL],
    });
    if (r.kind !== "tool") return err("ai_error", "Couldn't read a quote from that");
    const i = r.input as Partial<ExtractedQuote>;
    if (!i.vendorName) return err("ai_error", "No vendor found — try manual entry");
    return ok({
      vendorName: i.vendorName,
      amount: typeof i.amount === "number" ? i.amount : null,
      currency: i.currency || "USD",
      timeline: i.timeline || "",
      warranty: i.warranty || "",
      notes: i.notes || "",
      kind: i.kind === "final" ? "final" : "indicative",
    });
  } catch (e) {
    return mapAiErr(e);
  }
}

const RECOMMEND_TOOL: LlmTool = {
  name: "propose_recommendation",
  description: "Pick the best-value quote for the group and explain why briefly.",
  input_schema: {
    type: "object",
    properties: {
      choice: { type: "integer", description: "The 1-based number of the recommended quote from the list" },
      rationale: { type: "string", description: "One or two sentences on why it's the best value (price vs timeline/warranty/scope)" },
    },
    required: ["choice", "rationale"],
  },
};

export async function recommendQuote(
  ctx: Ctx,
  args: { cohortId: string; context: string }
): Promise<Result<{ choice: number; rationale: string }>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, { cohortId: args.cohortId });
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      system:
        "Recommend the best-value quote for a neighbor group, weighing price against timeline, warranty and scope fit — not just the cheapest. Always call propose_recommendation with the quote's number.",
      messages: [{ role: "user", content: args.context }],
      tools: [RECOMMEND_TOOL],
    });
    if (r.kind !== "tool") return err("ai_error", "No recommendation returned");
    const i = r.input as { choice?: number; rationale?: string };
    if (typeof i.choice !== "number") return err("ai_error", "No choice returned");
    return ok({ choice: i.choice, rationale: i.rationale || "" });
  } catch (e) {
    return mapAiErr(e);
  }
}

export async function answerDiscussion(
  ctx: Ctx,
  args: { cohortId: string; context: string; question: string }
): Promise<Result<string>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, { cohortId: args.cohortId });
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      maxTokens: 700,
      system:
        "You are a helpful assistant in a neighbor group-buying project's discussion. Answer the member's question using the project context. Be concise, practical and friendly. Format for readability with light Markdown — short paragraphs, bullet points (`- `) for lists, and **bold** for key terms; keep it brief. If it's outside what you can know, say so and suggest who to ask. Do not invent specific prices or vendors.",
      messages: [{ role: "user", content: `${args.context}\n\nMember question: ${args.question}` }],
    });
    return ok(r.kind === "text" ? r.text : "…");
  } catch (e) {
    return mapAiErr(e);
  }
}

function mapAiErr(e: unknown) {
  if (e instanceof LlmConfigError) return err("ai_unconfigured", "AI isn't configured yet — set an API key (see SETUP.md).");
  return err("ai_error", e instanceof Error ? e.message : "AI request failed");
}

export async function estimateBenchmark(
  ctx: Ctx,
  args: { cohortId: string; context: string }
): Promise<Result<{ low: number; high: number; currency: string; assumptions: string[]; rationale: string }>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const m = await resolveModel(ctx, { cohortId: args.cohortId });
  const provider = (m.ok ? m.data.provider : "anthropic") === "openai" ? "openai" : "anthropic";
  const model = m.ok ? m.data.model : "claude-sonnet-4-6";
  try {
    const r = await runMessages({
      provider,
      model,
      system:
        "You estimate a realistic typical TOTAL price range for a neighbor group-buying project, to set expectations. State the concrete criteria you assumed (dimensions, material, scope) — if the scope is vague, assume typical values and say so. Be honest and conservative; it's only a benchmark. Always call propose_benchmark.",
      messages: [{ role: "user", content: args.context }],
      tools: [BENCHMARK_TOOL],
    });
    if (r.kind !== "tool") return err("ai_error", "No estimate returned");
    const i = r.input as { low?: number; high?: number; currency?: string; assumptions?: string[]; rationale?: string };
    if (typeof i.low !== "number" || typeof i.high !== "number") return err("ai_error", "Incomplete estimate");
    return ok({
      low: i.low,
      high: i.high,
      currency: i.currency || "USD",
      assumptions: Array.isArray(i.assumptions) ? i.assumptions.filter(Boolean) : [],
      rationale: i.rationale || "",
    });
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
