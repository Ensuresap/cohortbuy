import type { Ctx } from "./context";

/** Platform operator (staff or admin). Use to gate admin-only services. */
export function isStaff(ctx: Ctx): boolean {
  return ctx.actor?.role === "staff" || ctx.actor?.role === "admin";
}
