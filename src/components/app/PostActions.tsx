"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Globe, Lock, X, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { editPost, removePost, changePostVisibility } from "@/app/cohorts/actions";

type Visibility = "members" | "public";

type Post = {
  id: string;
  body: string;
  visibility: Visibility;
  image_url: string | null;
  author_name: string | null;
  author_avatar: string | null;
};

function initials(name: string | null) {
  return (name ?? "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
}

async function uploadImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `posts/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("cohort-media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("cohort-media").getPublicUrl(path).data.publicUrl;
}

export default function PostActions({
  post,
  handle,
  cohortName,
}: {
  post: Post;
  handle: string;
  cohortName: string;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function del() {
    setMenu(false);
    if (!confirm("Delete this post? This can't be undone.")) return;
    await removePost({ postId: post.id, handle });
    router.refresh();
  }
  async function quickToggle() {
    setMenu(false);
    await changePostVisibility({
      postId: post.id,
      handle,
      visibility: post.visibility === "public" ? "members" : "public",
    });
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setMenu((o) => !o)}
        aria-label="Post actions"
        className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-text"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
          <button onClick={() => { setEditing(true); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2">
            <Pencil className="h-4 w-4 text-muted" /> Edit post
          </button>
          <button onClick={quickToggle} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2">
            {post.visibility === "public" ? <Lock className="h-4 w-4 text-muted" /> : <Globe className="h-4 w-4 text-muted" />}
            {post.visibility === "public" ? "Make members-only" : "Make public"}
          </button>
          <button onClick={del} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-surface-2">
            <Trash2 className="h-4 w-4" /> Delete post
          </button>
        </div>
      )}

      {editing && (
        <EditModal post={post} handle={handle} cohortName={cohortName} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />
      )}
    </div>
  );
}

function EditModal({
  post,
  handle,
  cohortName,
  onClose,
  onSaved,
}: {
  post: Post;
  handle: string;
  cohortName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState(post.body);
  const [visibility, setVisibility] = useState<Visibility>(post.visibility);
  const [file, setFile] = useState<File | null>(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const previewSrc = removeImg ? null : file ? URL.createObjectURL(file) : post.image_url;

  async function save() {
    if (!body.trim()) {
      setError("Post can't be empty.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let imageUrl: string | undefined;
      if (file) imageUrl = await uploadImage(file);
      else if (removeImg) imageUrl = "";
      const res = await editPost({ postId: post.id, handle, body, imageUrl, visibility });
      if (!res.ok) {
        setError(res.error || "Couldn't save.");
        setBusy(false);
        return;
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="my-6 w-full max-w-xl rounded-2xl border border-border bg-surface shadow-soft" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            {post.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials(post.author_name)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-text">{post.author_name ?? "You"}</p>
              <p className="text-xs text-subtle">Posted to {cohortName}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Editor */}
        <div className="px-5 py-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to share?"
            className="min-h-[200px] w-full resize-y rounded-xl bg-transparent text-base text-text outline-none placeholder:text-subtle"
            autoFocus
          />
          {previewSrc && (
            <div className="relative mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="" className="w-full rounded-xl border border-border object-cover" />
              <button
                onClick={() => { setFile(null); setRemoveImg(true); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-2">
            <ImagePlus className="h-4 w-4 text-muted" />
            {previewSrc ? "Change image" : "Add image"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveImg(false); }} />
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            aria-label="Visibility"
            className="rounded-xl border border-border bg-surface-2 px-2 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="members">Members only</option>
            <option value="public">Public</option>
          </select>
          <div className="flex-1" />
          {error && <p className="w-full text-sm text-accent sm:order-first sm:w-auto sm:flex-1">{error}</p>}
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
