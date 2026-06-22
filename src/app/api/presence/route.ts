import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { touchPresence } from "@/core/profiles/services/profileService";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await touchPresence({ db: supabase, actor: { id: user.id } });
  return NextResponse.json({ ok: true });
}
