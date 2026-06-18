"use client";

import { useState } from "react";
import { Info, Share2, UserPlus, LogOut, Lock } from "lucide-react";
import EditProjectButton from "@/components/app/EditProjectButton";
import { joinRequestAction, leaveProjectAction } from "@/app/requests/actions";

const barBtn =
  "inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2";

export interface ProjectSummary {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  driver: string | null;
  targetDate: string | null;
  locked: boolean;
  stageLabel: string;
  cohortName: string | null;
  startedLabel: string;
  targetLabel: string;
  participants: number;
  scopeCount: number;
  priceLabel: string;
}

export default function ProjectHeaderActions({
  project,
  canEdit,
  canJoin,
  canExit,
  joinClosedReason,
}: {
  project: ProjectSummary;
  canEdit: boolean;
  canJoin: boolean;
  canExit: boolean;
  joinClosedReason: string | null;
}) {
  const [about, setAbout] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => setAbout(true)} className={barBtn}>
          <Info className="h-4 w-4" /> Info
        </button>
        <button type="button" onClick={share} className={barBtn}>
          <Share2 className="h-4 w-4" /> {copied ? "Copied!" : "Share"}
        </button>
        {canEdit && (
          <EditProjectButton
            requestId={project.id}
            title={project.title}
            category={project.category}
            description={project.description}
            driver={project.driver}
            targetDate={project.targetDate}
            locked={project.locked}
          />
        )}
        {canJoin && (
          <form action={joinRequestAction}>
            <input type="hidden" name="requestId" value={project.id} />
            <button
              type="submit"
              className="inline-flex min-h-touch items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              <UserPlus className="h-4 w-4" /> Join
            </button>
          </form>
        )}
        {!canJoin && joinClosedReason && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-subtle">
            <Lock className="h-3.5 w-3.5" /> {joinClosedReason}
          </span>
        )}
        {canExit && (
          <form
            action={leaveProjectAction}
            onSubmit={(e) => {
              if (!confirm("Leave this project? You can re-join while it stays open.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="requestId" value={project.id} />
            <button type="submit" className={`${barBtn} text-accent`}>
              <LogOut className="h-4 w-4" /> Exit
            </button>
          </form>
        )}
      </div>

      {about && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAbout(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-text">{project.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">{project.stageLabel}</span>
              {project.category && (
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-medium text-text">{project.category}</span>
              )}
              {project.locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 font-medium text-subtle">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Fact label="Cohort" value={project.cohortName ?? "—"} />
              <Fact label="Participants" value={String(project.participants)} />
              <Fact label="Started" value={project.startedLabel} />
              <Fact label="Target" value={project.targetLabel} />
              <Fact label="Scope items" value={String(project.scopeCount)} />
              <Fact label="Price" value={project.priceLabel} />
            </dl>

            {project.description && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-text">About</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{project.description}</p>
              </div>
            )}
            {project.driver && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-text">Why now — the driver</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{project.driver}</p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setAbout(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  );
}
