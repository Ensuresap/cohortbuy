"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import TagPicker from "@/components/app/TagPicker";
import ZipCoverageField from "@/components/app/ZipCoverageField";
import type { TagCatalogItem } from "@/core/cohorts/domain/cohort";
import { saveCohortSettings, leaveCohortAction } from "@/app/cohorts/actions";
import {
  Info,
  Share2,
  SquarePen,
  MoreHorizontal,
  LogOut,
  X,
  ArrowLeft,
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
  kind: "service" | "group_buy";
  tags: string[] | null;
  city: string | null;
  region: string | null;
  coverage_zips: string[] | null;
  created_at: string;
  join_questions: { text: string; expected?: string }[] | null;
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
  tagCatalog,
}: {
  cohort: CohortLite;
  isManager: boolean;
  isMember: boolean;
  isOwner: boolean;
  tagCatalog: TagCatalogItem[];
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
      <Link
        href="/cohorts"
        aria-label="Back to cohorts"
        title="Cohorts"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:bg-surface-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </Link>
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
        <SettingsModal cohort={cohort} tagCatalog={tagCatalog} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} />
      )}
    </div>
  );
}

function SettingsModal({
  cohort,
  tagCatalog,
  onClose,
  onSaved,
}: {
  cohort: CohortLite;
  tagCatalog: TagCatalogItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cohort.name);
  const [tagline, setTagline] = useState(cohort.tagline ?? "");
  const [description, setDescription] = useState(cohort.description ?? "");
  const [tags, setTags] = useState<string[]>(cohort.tags ?? []);
  const [kind, setKind] = useState<"service" | "group_buy">(cohort.kind);
  const [city, setCity] = useState(cohort.city ?? "");
  const [region, setRegion] = useState(cohort.region ?? "");
  const [coverageZips, setCoverageZips] = useState<string[]>(cohort.coverage_zips ?? []);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<{ text: string; expected?: string }[]>(
    cohort.join_questions ?? []
  );
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
        joinQuestions: questions.filter((q) => q.text.trim()),
        tags,
        kind,
        city,
        region,
        coverageZips,
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

        <div>
          <label htmlFor="cohort-name" className="mb-1.5 block text-sm font-medium text-text">
            Name
          </label>
          <input
            id="cohort-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maple St Fence Project"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="cohort-tagline" className="mb-1.5 block text-sm font-medium text-text">
            Tagline <span className="font-normal text-subtle">(optional)</span>
          </label>
          <input
            id="cohort-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Short slogan shown under the name"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="cohort-description" className="mb-1.5 block text-sm font-medium text-text">
            Description
          </label>
          <textarea
            id="cohort-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this cohort organizing?"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="cohort-kind" className="mb-1.5 block text-sm font-medium text-text">
            Cohort type
          </label>
          <select
            id="cohort-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "service" | "group_buy")}
            className={fieldClass}
          >
            <option value="service">Service — work done per home</option>
            <option value="group_buy">Group buy — volume product order</option>
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-text">Tags</p>
          <TagPicker catalog={tagCatalog} defaultValue={cohort.tags ?? []} kind={kind} onChange={setTags} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label htmlFor="cohort-city" className="mb-1.5 block text-sm font-medium text-text">
              City
            </label>
            <input
              id="cohort-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Austin"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="cohort-region" className="mb-1.5 block text-sm font-medium text-text">
              State
            </label>
            <input
              id="cohort-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="TX"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-text">Coverage area (ZIP codes)</p>
          <ZipCoverageField defaultValue={cohort.coverage_zips ?? []} onChange={setCoverageZips} />
          <p className="mt-1 text-xs text-subtle">The ZIP codes this cohort serves.</p>
        </div>

        <div>
          <p className="text-sm font-medium text-text">Join questions</p>
          <p className="mb-2 text-xs text-subtle">Asked when someone requests to join. Expected answer is optional (for your screening).</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border p-2">
                <input aria-label={`Join question ${i + 1}`} value={q.text} onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Question" className="mb-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-text outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-1">
                  <input aria-label={`Expected answer for question ${i + 1}`} value={q.expected ?? ""} onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, expected: e.target.value } : x)))} placeholder="Expected answer (optional)" className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-text outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} aria-label="Remove question" className="rounded-lg border border-border px-2 text-sm text-accent hover:bg-surface-2">×</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setQuestions((qs) => [...qs, { text: "", expected: "" }])} className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-2">+ Add question</button>
        </div>

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
