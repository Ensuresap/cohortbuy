import { z } from "zod";
import type { LlmTool } from "../../ai/llm";

export const AdvisorMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type AdvisorMessage = z.infer<typeof AdvisorMessage>;

export const AdviseInput = z.object({
  cohortId: z.string().uuid(),
  messages: z.array(AdvisorMessage).min(1).max(40),
});

/** What the advisor hands off to project setup. */
export const ProjectProfileProposal = z.object({
  title: z.string(),
  category: z.string().optional().default(""),
  projectType: z.enum(["service", "group_buy"]).default("service"),
  serviceScope: z.enum(["service", "equipment", "both"]).default("service"),
  splitMethod: z.enum(["even", "by_quantity", "by_usage", "custom"]).default("even"),
  minSize: z.number().int().min(1).max(100).default(2),
  driver: z.string().optional().default(""),
  fit: z.enum(["good", "maybe", "poor"]).default("good"),
  fitReason: z.string().optional().default(""),
});
export type ProjectProfileProposal = z.infer<typeof ProjectProfileProposal>;

export interface AdvisorReply {
  message?: string;
  proposal?: ProjectProfileProposal;
}

/** The structured handoff tool the model calls when it has enough to propose a setup. */
export const PROPOSE_TOOL: LlmTool = {
  name: "propose_project",
  description:
    "Call this ONLY when you have validated the fit and gathered enough to shape the project: a clear title, category, type, what's included, a sensible split method, rough group size, and the driver. Calling it ends the conversation and hands a pre-filled setup to the coordinator.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short project title, e.g. 'Backyard fence replacement'" },
      category: { type: "string", description: "Category, e.g. 'Fencing', 'Solar'" },
      projectType: {
        type: "string",
        enum: ["service", "group_buy"],
        description: "service = work done per home (RFQ to vendors); group_buy = volume product order",
      },
      serviceScope: { type: "string", enum: ["service", "equipment", "both"] },
      splitMethod: {
        type: "string",
        enum: ["even", "by_quantity", "by_usage", "custom"],
        description: "How costs split across members",
      },
      minSize: { type: "integer", description: "Rough minimum group size to make it worthwhile" },
      driver: { type: "string", description: "Why now — the motivation behind the project" },
      fit: { type: "string", enum: ["good", "maybe", "poor"] },
      fitReason: { type: "string", description: "One sentence on why it is or isn't a good fit to pool" },
    },
    required: ["title", "projectType", "serviceScope", "splitMethod", "minSize", "fit"],
  },
};

export function advisorSystemPrompt(cohortName: string): string {
  return [
    "You are the CohortBuy Advisor — the front door (Stage 0) before a neighbor sets up a group-buying project.",
    `The person is a member of the “${cohortName}” cohort. CohortBuy lets neighbors pool demand to get a better price on services (fencing, solar, tree work…) or bulk products; the platform facilitates and never holds funds.`,
    "",
    "Your job, in order: (1) understand the intent, (2) honestly validate whether it's a good fit to pool, (3) shape it, (4) hand off a pre-filled setup.",
    "",
    "VALIDATION — be a qualifier, not a yes-machine. Good fits are standardized work/products where a vendor travels to a cluster of nearby homes and volume earns a discount, with real interest from several neighbors. If it's better bought solo, highly bespoke per home with no shared leverage, or the interest is just a guess, say so plainly and suggest they check with neighbors first.",
    "",
    "PACING (strict): Ask roughly ONE thing at a time and wait for the answer. Do NOT re-summarize what's already settled on every turn — state a point once. Do NOT present the full project profile in chat; the propose_project tool is the single handoff. Move in small steps: understand → validate → shape → confirm. Offer a default or trade-off only when a choice actually matters, briefly. Keep replies to 1–3 short sentences. Warm, plain language for a non-technical neighbor.",
    "",
    "When (and only when) you've validated the fit and have enough to shape it, call the propose_project tool. If the fit is poor, you may still propose with fit='poor' and a clear reason, or keep advising — use judgement.",
  ].join("\n");
}
