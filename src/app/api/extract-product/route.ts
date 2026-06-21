import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractProduct } from "@/core/research/services/researchAiService";

export const dynamic = "force-dynamic";

// Pull product details from pasted text (a product page copy or description),
// then AI-extract name/specs/url/price. No live URL fetch (no web access).
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const text = form ? String(form.get("text") ?? "") : "";
  if (!text.trim()) return NextResponse.json({ error: { message: "Paste the product details first." } }, { status: 400 });

  const ctx = { db: supabase, actor: { id: user.id } };
  const res = await extractProduct(ctx, { text });
  if (!res.ok) {
    const status = res.error.code === "ai_unconfigured" ? 503 : 422;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ product: res.data });
}
