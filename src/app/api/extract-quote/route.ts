import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractQuote } from "@/core/research/services/researchAiService";

export const dynamic = "force-dynamic";

// Pull quote text from a pasted email or an uploaded document, then AI-extract fields.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });

  let text = "";
  const form = await req.formData().catch(() => null);
  if (form) {
    text = String(form.get("text") ?? "");
    const file = form.get("file");
    if (!text && file && typeof file !== "string") {
      const f = file as File;
      const buf = Buffer.from(await f.arrayBuffer());
      if (f.type === "application/pdf") {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore pdf-parse is resolved at runtime (declared in package.json; run npm install)
          const pdfParse = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text: string }>;
          text = (await pdfParse(buf)).text;
        } catch {
          return NextResponse.json({ error: { message: "Couldn't read that PDF — paste the text instead." } }, { status: 422 });
        }
      } else if (f.type.startsWith("text/")) {
        text = buf.toString("utf8");
      } else {
        return NextResponse.json({ error: { message: "Unsupported file — upload a PDF or paste the text." } }, { status: 422 });
      }
    }
  }

  if (!text.trim()) return NextResponse.json({ error: { message: "Nothing to read." } }, { status: 400 });

  const ctx = { db: supabase, actor: { id: user.id } };
  const res = await extractQuote(ctx, { text });
  if (!res.ok) {
    const status = res.error.code === "ai_unconfigured" ? 503 : 422;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ quote: res.data });
}
