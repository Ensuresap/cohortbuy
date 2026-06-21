"use client";

import { useState } from "react";
import GuideBody from "@/components/GuideBody";
import { slugify, estimateReadMins } from "@/core/guides/domain/guide";
import { saveGuideAction } from "@/app/admin/guides/actions";

type Initial = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  body: string;
  readMins: number;
  status: "draft" | "published";
};

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-text outline-none focus:ring-2 focus:ring-ring";

export default function GuideEditor({ initial, error }: { initial: Initial; error?: string }) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [body, setBody] = useState(initial.body);
  const [readMins, setReadMins] = useState(initial.readMins);

  function onTitle(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={saveGuideAction} className="space-y-3">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        {error && <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}

        <label className="block text-sm">
          <span className="text-subtle">Title</span>
          <input name="title" required value={title} onChange={(e) => onTitle(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          <span className="text-subtle">Slug</span>
          <input name="slug" required value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className={`${field} mt-1`} />
          <span className="mt-1 block text-xs text-subtle">/guides/{slug || "…"}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-subtle">Category</span>
            <input name="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Savings" className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            <span className="text-subtle">Read mins</span>
            <input name="readMins" type="number" min="1" max="60" value={readMins} onChange={(e) => setReadMins(Number(e.target.value))} className={`${field} mt-1`} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-subtle">Summary (shown on cards + meta description)</span>
          <textarea name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          <span className="flex items-center justify-between text-subtle">
            Body (Markdown)
            <button type="button" onClick={() => setReadMins(estimateReadMins(body))} className="text-xs font-medium text-primary hover:underline">Estimate read time</button>
          </span>
          <textarea name="body" required rows={20} value={body} onChange={(e) => setBody(e.target.value)} className={`${field} mt-1 font-mono text-sm`} placeholder={"## A heading\n\nA paragraph.\n\n- a bullet\n- another\n\n> A pull-quote."} />
          <span className="mt-1 block text-xs text-subtle">Use ## / ### for headings, - for bullets, 1. for steps, &gt; for quotes, **bold**, [text](url).</span>
        </label>
        <div className="flex items-center gap-2 pt-1">
          <button type="submit" name="status" value="published" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Publish</button>
          <button type="submit" name="status" value="draft" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">Save draft</button>
        </div>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Live preview</p>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{category || "Category"}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-text">{title || "Untitled guide"}</h1>
          <div className="mt-5">
            <GuideBody body={`${description}\n\n${body}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
