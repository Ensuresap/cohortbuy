"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { saveCohortSettings, leaveCohortAction } from "@/app/cohorts/actions";
import {
  Info,
  Share2,
  SquarePen,
  MoreHorizontal,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

type CohortLite = {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  tagline: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  visibility: "public" | "private";
  created_at: string;
};

async function uploadTo(folder: string, cohortId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${cohortId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("cohort-media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("cohort-media").getPublicUrl(path).data.publicUrl;
}

export default function CohortHeaderActions({
  cohort,
  isManager,
  isMember,
  isOwner,
}: {
  cohort: CohortLite;
  isManager: boolean;
  isMember: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "about" | "settings">(null);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(`${location.origin}/${cohort.handle}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
    setMenu(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      <IconButton label="About" onClick={() => setModal("about")} Icon={Info} />
      <IconButton label="Copy link" onClick={copyLink} Icon={Share2} />
      {isManager && (
        <IconButton label="Edit" onClick={() => setModal("settings")} Icon={SquarePen} />
      )}
      {isMember && !isOwner && (
        <div className="relative">
          <IconButton label="More" onClick={() => setMenu((o) => !o)} Icon={MoreHorizontal} />
          {menu && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
              <form action={leaveCohortAction}>
                <input type="hidden" name="cohortId" value={cohort.id} />
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-surface-2">
                  <LogOut className="h-4 w-4" /> Leave this cohort
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {copied && <span className="ml-1 text-xs text-subtle">Copied</span>}

      {modal === "about" && (
        <Modal title="About this cohort" onClose={() => setModal(null)}>
          <h4 className="text-sm font-semibold text-text">Description</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {cohort.description || "No description yet."}
          </p>
          <h4 className="mt-5 text-sm font-semibold text-text">Details</h4>
          <dl className="mt-2 space-y-3 text-sm">
            <Detail term={cohort.visibility === "public" ? "Public" : "Private"}
              desc={cohort.visibility === "public" ? "Anyone signed in can find and request to join." : "Invite/link only; not shown in search."} />
            <Detail term="Posts" desc="Only admins and co-admins can post to the feed." />
            <Detail term="Established" desc={new Date(cohort.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
          </dl>
        </Modal>
      )}

      {modal === "settings" && (
        <SettingsModal cohort={cohort} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} />
      )}
    </div>
  );
}

function SettingsModal({
  cohort,
  onClose,
  onSaved,
}: {
  cohort: CohortLite;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cohort.name);
  const [tagline, setTagline] = useState(cohort.tagline ?? "");
  const [description, setDescription] = useState(cohort.description ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  async function save() {
    setBusy(true);
    setError("");
    try {
      let coverUrl = cohort.cover_url ?? "";
      let avatarUrl = cohort.avatar_url ?? "";
      if (coverFile) {
        if (coverFile.size > 5 * 1024 * 1024) throw new Error("Cover must be under 5MB.");
        coverUrl = await uploadTo("covers", cohort.id, coverFile);
      }
      if (logoFile) {
        if (logoFile.size > 5 * 1024 * 1024) throw new Error("Logo must be under 5MB.");
        avatarUrl = await uploadTo("logos", cohort.id, logoFile);
      }
      const res = await saveCohortSettings({
        cohortId: cohort.id, handle: cohort.handle, name, tagline, description, avatarUrl, coverUrl,
      });
      if (!res.ok) throw new Error(res.error);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit cohort" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-text">Cover image</p>
          <div className="h-24 overflow-hidden rounded-xl bg-gradient-to-br from-brand-forest to-brand-forest-dark">
            {(coverFile || cohort.cover_url) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverFile ? URL.createObjectURL(coverFile) : cohort.cover_url!} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <label className="mt-2 inline-block cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-2">
            {coverFile ? "Change cover" : "Upload cover"}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </label>
          <p className="mt-1 text-xs text-subtle">Recommended 1128×191px (wide). JPG/PNG, ≤5MB. It auto-fits the banner.</p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-text">Logo</p>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-xl bg-primary">
              {(logoFile || cohort.avatar_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoFile ? URL.createObjectURL(logoFile) : cohort.avatar_url!} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-2">
              {logoFile ? "Change logo" : "Upload logo"}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <p className="mt-1 text-xs text-subtle">Square works best (e.g. 300×300). ≤5MB.</p>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={fieldClass} />
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Slogan / tagline" className={fieldClass} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" className={fieldClass} />

        {error && <p className="text-sm text-accent">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">Cancel</button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Detail({ term, desc }: { term: string; desc: string }) {
  return (
    <div>
      <dt className="font-medium text-text">{term}</dt>
      <dd className="text-muted">{desc}</dd>
    </div>
  );
}

function IconButton({ label, onClick, Icon }: { label: string; onClick: () => void; Icon: LucideIcon }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:bg-surface-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}
