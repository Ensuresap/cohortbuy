import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { conciergeReply } from "@/core/concierge/services/conciergeService";
import type { LlmMessage } from "@/core/ai/llm";

export const dynamic = "force-dynamic";

const FALLBACK =
  "CohortBuy lets neighbors team up to save on home projects — pool demand, get real quotes, and split the cost fairly (you pay the vendor directly). Want to **browse cohorts near you**, **read a quick guide**, or **start one** for your street?";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.messages) ? body.messages : [];

  // Sanitize: only role/content, cap counts + lengths.
  const messages: LlmMessage[] = raw
    .filter((m: unknown): m is { role: string; content: string } =>
      !!m && typeof (m as { content?: unknown }).content === "string"
    )
    .slice(-12)
    .map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 1500),
    }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a message." }, { status: 400 });
  }

  const supabase = await createClient();
  const ctx = { db: supabase, actor: undefined };
  const res = await conciergeReply(ctx, messages);

  if (!res.ok) {
    // Degrade gracefully when AI isn't configured — still helpful + on brand.
    return NextResponse.json({ reply: FALLBACK, fallback: true });
  }
  return NextResponse.json({ reply: res.data });
}
