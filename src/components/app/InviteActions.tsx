"use client";

import { useEffect, useState } from "react";
import { Link2, Check, MessageCircle, Megaphone } from "lucide-react";
import { announceProjectAction } from "@/app/requests/actions";

/** Recruit neighbors to a project: copy the invite link, share to WhatsApp,
 *  or (managers) announce it to the cohort feed. */
export default function InviteActions({
  requestId,
  title,
  cohortId,
  handle,
  canAnnounce,
}: {
  requestId: string;
  title: string;
  cohortId: string;
  handle: string;
  canAnnounce: boolean;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/invite/${requestId}`);
  }, [requestId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const waText = encodeURIComponent(`Join our group buy: ${title}\n${url}`);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-subtle" />
        <span className="truncate text-xs text-muted">{url || "…"}</span>
        <button onClick={copy} className="ml-auto shrink-0 text-xs font-semibold text-primary hover:underline">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-touch items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-2"
      >
        <MessageCircle className="h-4 w-4 text-primary" /> Share to WhatsApp
      </a>

      {canAnnounce && (
        <form
          action={announceProjectAction}
          onSubmit={() => setAnnounced(true)}
        >
          <input type="hidden" name="cohortId" value={cohortId} />
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="handle" value={handle} />
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="url" value={url} />
          <button
            type="submit"
            disabled={announced}
            className="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-2 disabled:opacity-60"
          >
            {announced ? <Check className="h-4 w-4 text-primary" /> : <Megaphone className="h-4 w-4 text-primary" />}
            {announced ? "Announced to cohort" : "Announce to cohort feed"}
          </button>
        </form>
      )}
    </div>
  );
}
