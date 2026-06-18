/**
 * Minimal Anthropic Messages client. Server-only. Returns either assistant text
 * or a single tool call. Keys come from env (never the client).
 */

export type LlmMessage = { role: "user" | "assistant"; content: string };

export type LlmTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type LlmResult =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; input: Record<string, unknown> };

export class LlmConfigError extends Error {}

export async function runMessages(args: {
  model: string;
  system: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  maxTokens?: number;
}): Promise<LlmResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new LlmConfigError("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens ?? 1024,
      system: args.system,
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
      ...(args.tools ? { tools: args.tools } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
  };
  const blocks = data.content ?? [];
  const tool = blocks.find((b) => b.type === "tool_use");
  if (tool?.name) return { kind: "tool", name: tool.name, input: tool.input ?? {} };
  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  return { kind: "text", text: text || "…" };
}
