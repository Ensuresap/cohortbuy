"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/core/audit/services/auditService";

/** Records that an admin revealed a masked PII value. Best-effort, no redirect. */
export async function logPiiRevealAction(kind: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await logAudit(
    { db: supabase, actor: { id: user.id } },
    { action: "pii_reveal", targetType: kind || "contact" }
  );
}
