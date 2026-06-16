import { NextResponse } from "next/server";
import { createServerClient } from "@/core/db/serverClient";
import { joinWaitlist } from "@/core/services/waitlistService";

// REST entry point — a thin adapter over the shared service.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ctx = { db: createServerClient() };
  const result = await joinWaitlist(ctx, body);

  if (!result.ok) {
    const status =
      result.error.code === "invalid_input"
        ? 400
        : result.error.code === "not_configured"
          ? 503
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ data: result.data });
}
