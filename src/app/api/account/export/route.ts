import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportMyData } from "@/core/profiles/services/profileService";
import { logAudit } from "@/core/audit/services/auditService";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ctx = { db: supabase, actor: { id: user.id } };

  const res = await exportMyData(ctx);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });

  await logAudit(ctx, { action: "data_export", targetType: "self", targetId: user.id });

  return new NextResponse(JSON.stringify(res.data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cohortbuy-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
