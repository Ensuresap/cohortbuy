/**
 * Minimal multi-provider LLM client. Server-only. Returns either assistant text
 * or a single tool call. Keys come from env (never the client).
 * Supported providers: "anthropic" (Messages API), "openai" (Chat Completions).
 */

export type LlmProvider = "anthropic" | "openai";

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
  provider: LlmProvider;
  model: string;
  system: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  maxTokens?: number;
}): Promise<LlmResult> {
  return args.provider === "openai" ? runOpenAI(args) : runAnthropic(args);
}

async function runAnthropic(args: {
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
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
  };
  const blocks = data.content ?? [];
  const tool = blocks.find((b) => b.type === "tool_use");
  if (tool?.name) return { kind: "tool", name: tool.name, input: tool.input ?? {} };
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  return { kind: "text", text: text || "…" };
}

async function runOpenAI(args: {
  model: string;
  system: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  maxTokens?: number;
}): Promise<LlmResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new LlmConfigError("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens ?? 1024,
      messages: [
        { role: "system", content: args.system },
        ...args.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      ...(args.tools
        ? {
            tools: args.tools.map((t) => ({
              type: "function",
              function: { name: t.name, description: t.description, parameters: t.input_schema },
            })),
            tool_choice: "auto",
          }
        : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
      };
    }>;
  };
  const msg = data.choices?.[0]?.message;
  const call = msg?.tool_calls?.[0]?.function;
  if (call?.name) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(call.arguments ?? "{}");
    } catch {
      /* leave empty; caller validates */
    }
    return { kind: "tool", name: call.name, input };
  }
  return { kind: "text", text: (msg?.content ?? "").trim() || "…" };
}
