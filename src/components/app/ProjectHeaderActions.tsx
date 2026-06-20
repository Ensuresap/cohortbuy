"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Info,
  Share2,
  UserPlus,
  LogOut,
  Lock,
  MoreHorizontal,
  Link2,
  MessageCircle,
  Megaphone,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import EditProjectButton from "@/components/app/EditProjectButton";
import { joinRequestAction, leaveProjectAction, announceProjectAction } from "@/app/requests/actions";

export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  description: string | null;
  driver: string | null;
  targetDate: string | null;
  serviceScope: "service" | "equipment" | "both";
  splitMethod: "even" | "by_quantity" | "by_usage" | "custom";
  minSize: number;
  joinPolicy: "auto" | "approval";
  decisionPolicy: "coordinator" | "vote";
  locked: boolean;
  stageLabel: string;
  cohortId: string;
  cohortName: string | null;
  cohortHandle: string;
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
  canAnnounce,
  joinPending,
  joinClosedReason,
  backHref,
  backLabel,
}: {
  project: ProjectSummary;
  canEdit: boolean;
  canJoin: boolean;
  canExit: boolean;
  canAnnounce: boolean;
  joinPending: boolean;
  joinClosedReason: string | null;
  backHref?: string;
  backLabel?: string;
}) {
  const [about, setAbout] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/invite/${project.slug || project.id}`);
  }, [project.slug, project.id]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const waText =
    `Hi! 👋 A few of us are teaming up on *${project.title}*` +
    (project.cohortName ? ` with the ${project.cohortName} group` : "") +
    ` to get a better price together — the more of us, the bigger the saving.\n\n` +
    `Want in? Have a look and count yourself in here:\n${inviteUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const menuRow =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {backHref && (
        <Link
          href={backHref}
          aria-label={backLabel ?? "Back"}
          title={backLabel ?? "Back"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>
      )}
      <IconButton label="About this project" Icon={Info} onClick={() => setAbout(true)} />

      {/* Share & invite menu */}
      <div className="relative" ref={shareRef}>
        <IconButton label="Share & invite" Icon={Share2} onClick={() => setShareMenu((o) => !o)} />
        {shareMenu && (
          <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
            <button onClick={copyLink} className={menuRow}>
              <Link2 className="h-4 w-4 text-muted" /> {copied ? "Copied!" : "Copy invite link"}
            </button>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className={menuRow} onClick={() => setShareMenu(false)}>
              <MessageCircle className="h-4 w-4 text-primary" /> Share to WhatsApp
            </a>
            {canAnnounce && (
              <form action={announceProjectAction} onSubmit={() => { setAnnounced(true); setShareMenu(false); }}>
                <input type="hidden" name="cohortId" value={project.cohortId} />
                <input type="hidden" name="requestId" value={project.id} />
                <input type="hidden" name="handle" value={project.cohortHandle} />
                <input type="hidden" name="title" value={project.title} />
                <input type="hidden" name="url" value={inviteUrl} />
                <button type="submit" disabled={announced} className={`${menuRow} disabled:opacity-60`}>
                  <Megaphone className="h-4 w-4 text-primary" /> {announced ? "Announced to cohort" : "Announce to cohort feed"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {canEdit && (
        <EditProjectButton
          requestId={project.id}
          title={project.title}
          category={project.category}
          description={project.description}
          driver={project.driver}
          targetDate={project.targetDate}
          serviceScope={project.serviceScope}
          splitMethod={project.splitMethod}
          minSize={project.minSize}
          joinPolicy={project.joinPolicy}
          decisionPolicy={project.decisionPolicy}
          locked={project.locked}
        />
      )}

      {canJoin && (
        <form action={joinRequestAction}>
          <input type="hidden" name="requestId" value={project.id} />
          <Button type="submit" size="md" className="gap-1.5">
            <UserPlus className="h-4 w-4" /> {project.joinPolicy === "approval" ? "Request to join" : "Join"}
          </Button>
        </form>
      )}
      {!canJoin && joinPending && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-subtle">
          Request pending
        </span>
      )}
      {!canJoin && !joinPending && joinClosedReason && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-subtle">
          <Lock className="h-3.5 w-3.5" /> {joinClosedReason}
        </span>
      )}

      {canExit && (
        <div className="relative">
          <IconButton label="More" Icon={MoreHorizontal} onClick={() => setMoreMenu((o) => !o)} />
          {moreMenu && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
              <form
                action={leaveProjectAction}
                onSubmit={(e) => {
                  if (!confirm("Leave this project? You can re-join while it stays open.")) e.preventDefault();
                }}
              >
                <input type="hidden" name="requestId" value={project.id} />
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-surface-2">
                  <LogOut className="h-4 w-4" /> Leave this project
                </button>
              </form>
            </div>
          )}
        </div>
      )}

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
