"use client";

import { useState } from "react";
import { Info, Share2, UserPlus, LogOut, Lock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import EditProjectButton from "@/components/app/EditProjectButton";
import { joinRequestAction, leaveProjectAction } from "@/app/requests/actions";

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
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${project.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <IconButton label="About this project" Icon={Info} onClick={() => setAbout(true)} />
      <IconButton label="Copy link" Icon={Share2} onClick={share} />
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
          <Button type="submit" size="md" className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Join
          </Button>
        </form>
      )}
      {!canJoin && joinClosedReason && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-subtle">
          <Lock className="h-3.5 w-3.5" /> {joinClosedReason}
        </span>
      )}

      {canExit && (
        <div className="relative">
          <IconButton label="More" Icon={MoreHorizontal} onClick={() => setMenu((o) => !o)} />
          {menu && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
              <form
                action={leaveProjectAction}
                onSubmit={(e) => {
                  if (!confirm("Leave this project? You can re-join while it stays open.")) e.preventDefault();
                }}
              >
                <input type="hidden" name="requestId" value={project.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-surface-2"
                >
                  <LogOut className="h-4 w-4" /> Leave this project
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {copied && <span className="ml-1 text-xs text-subtle">Copied</span>}

      {about && (
        <Modal title={project.title} onClose={() => setAbout(false)}>
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-xs">
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
              <h4 className="text-sm font-semibold text-text">About</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{project.description}</p>
            </div>
          )}
          {project.driver && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-text">Why now — the driver</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{project.driver}</p>
            </div>
          )}
        </Modal>
      )}
    </div>
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
