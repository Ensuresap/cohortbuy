import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import { resolveModel } from "../../ai/services/aiConfigService";
import { runMessages, LlmConfigError } from "../../ai/llm";
import * as cohortRepo from "../../cohorts/repositories/cohortRepo";
import {
  AdviseInput,
  ProjectProfileProposal,
  PROPOSE_TOOL,
  advisorSystemPrompt,
  type AdvisorReply,
} from "../domain/advisor";

/**
 * One advisor turn. Takes the conversation so far, returns either the next
 * assistant message or a structured project proposal (the handoff to setup).
 */
export async function advise(ctx: Ctx, raw: unknown): Promise<Result<AdvisorReply>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = AdviseInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  // Membership gate: only an approved member of the cohort may use its advisor.
  const { data: cohort } = await cohortRepo.getById(ctx.db, parsed.data.cohortId);
  const cohortName = (cohort as { name?: string } | null)?.name ?? "your cohort";

  const modelRes = await resolveModel(ctx, { cohortId: parsed.data.cohortId });
  const model = modelRes.ok ? modelRes.data.model : "claude-sonnet-4-6";

  try {
    const result = await runMessages({
      model,
      system: advisorSystemPrompt(cohortName),
      messages: parsed.data.messages,
      tools: [PROPOSE_TOOL],
    });

    if (result.kind === "tool") {
      const p = ProjectProfileProposal.safeParse(result.input);
      if (!p.success) return err("bad_proposal", "The advisor returned an incomplete setup");
      return ok({ proposal: p.data });
    }
    return ok({ message: result.text });
  } catch (e) {
    if (e instanceof LlmConfigError) {
      return err("ai_unconfigured", "AI isn't configured yet — set ANTHROPIC_API_KEY (see SETUP.md).");
    }
    return err("ai_error", e instanceof Error ? e.message : "AI request failed");
  }
}
