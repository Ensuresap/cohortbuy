import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getRequest,
  listParticipants,
} from "@/core/requests/services/requestService";
import { PIPELINE, STAGE_LABELS, type RequestStatus } from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { joinRequestAction } from "../actions";

export default async function RequestPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const reqRes = await getRequest(ctx, { requestId: params.id });
  const req = reqRes.ok ? reqRes.data : null;
  if (!req) notFound();

  const partsRes = await listParticipants(ctx, { requestId: params.id });
  const participants = partsRes.ok ? partsRes.data : [];
  const isParticipant = participants.some((p) => p.user_id === user.id);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <p className="text-sm text-subtle">
          Project · {STAGE_LABELS[req.status]}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-text">
          {req.title}
        </h1>
        {req.category && (
          <span className="mt-2 inline-block rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text">
            {req.category}
          </span>
        )}
        {req.description && <p className="mt-3 text-muted">{req.description}</p>}

        <StageBar status={req.status} />

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">
              Participants ({participants.length})
            </p>
            {!isParticipant && req.status === "forming" && (
              <form action={joinRequestAction}>
                <input type="hidden" name="requestId" value={req.id} />
                <Button type="submit" size="md">Join this project</Button>
              </form>
            )}
          </div>
          <ul className="mt-3 space-y-1">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-text">
                  Member <span className="text-subtle">{p.user_id.slice(0, 8)}…</span>
                </span>
                <span className="text-xs text-subtle">{p.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </AppShell>
  );
}

function StageBar({ status }: { status: RequestStatus }) {
  const currentIndex = PIPELINE.indexOf(status);
  return (
    <div className="mt-6 flex flex-wrap gap-1.5">
      {PIPELINE.map((s, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        return (
          <span
            key={s}
            className={
              "rounded-full px-2.5 py-1 text-xs font-medium " +
              (done
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-subtle")
            }
          >
            {STAGE_LABELS[s]}
          </span>
        );
      })}
    </div>
  );
}
