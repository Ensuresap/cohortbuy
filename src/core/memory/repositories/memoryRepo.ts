import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecordMemoryInput } from "../domain/memory";

export function insertMemory(
  db: SupabaseClient,
  input: RecordMemoryInput,
  createdBy: string
) {
  return db.from("agent_memory").insert({
    scope: input.scope,
    cohort_id: input.cohortId,
    work_item_id: input.workItemId ?? null,
    key: input.key ?? null,
    content: input.content,
    created_by: createdBy,
  });
}

export function recallMemory(
  db: SupabaseClient,
  args: { cohortId: string; workItemId?: string; limit: number }
) {
  let q = db.from("agent_memory").select("*").eq("cohort_id", args.cohortId);
  // Work-item recall includes both that item's memory and cohort-level memory.
  if (args.workItemId) {
    q = q.or(`work_item_id.eq.${args.workItemId},scope.eq.cohort`);
  }
  return q.order("created_at", { ascending: false }).limit(args.limit);
}
