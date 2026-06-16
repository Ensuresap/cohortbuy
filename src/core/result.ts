/**
 * Uniform result type used by every service and tool, so all entry points
 * (UI, API routes, agent tools, MCP) handle success/failure the same way.
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = (code: string, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
