import type { SupabaseClient } from "@supabase/supabase-js";
import type { WaitlistSignupInput } from "../domain/waitlist";

/**
 * Data access only — no business rules. All `waitlist` table queries live here.
 */
export function insertSignup(db: SupabaseClient, input: WaitlistSignupInput) {
  return db
    .from("waitlist")
    .insert({ email: input.email, zip: input.zip ?? null, source: input.source })
    .select()
    .single();
}
