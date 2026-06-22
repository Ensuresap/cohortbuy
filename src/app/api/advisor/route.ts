import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { advise } from "@/core/advisor/services/advisorService";

// Advisor turn endpoint. Auth via cookie session; thin adapter over the service.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ctx = { db: supabase, actor: { id: user.id } };
  const result = await advise(ctx, body);

  if (!result.ok) {
    const status =
      result.error.code === "invalid_input"
        ? 400
        : result.error.code === "ai_unconfigured"
          ? 503
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result.data);
}
