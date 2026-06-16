import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Execution context passed into every service. Built by the entry point
 * (API route, agent runtime, MCP server) and never constructed inside a
 * service — this keeps services framework-free and easy to test/reuse.
 */
export interface Actor {
  id?: string;
  role?: "member" | "staff" | "admin" | "agent";
}

export interface Ctx {
  db: SupabaseClient | null;
  actor?: Actor;
}
