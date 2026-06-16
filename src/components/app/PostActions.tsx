"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { editPost, removePost, changePostVisibility } from "@/app/cohorts/actions";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none focus:ring-2 focus:ring-ring";

export default function PostActions({
  post,
  handle,
}: {
  post: { id: string; body: string; visibility: "members" | "public" };
  handle: string;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function save() {
    setBusy(true);
    await editPost({ postId: post.id, handle, body });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }
  async function del() {
    setMenu(false);
    if (!confirm("Delete this post? This can't be undone.")) return;
    await removePost({ postId: post.id, handle });
    router.refresh();
  }
  async function toggleVisibility() {
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
          <button
            onClick={() => {
              setEditing(true);
              setMenu(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
          >
            <Pencil className="h-4 w-4 text-muted" /> Edit post
          </button>
          <button
            onClick={toggleVisibility}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
          >
            {post.visibility === "public" ? (
              <>
                <Lock className="h-4 w-4 text-muted" /> Make members-only
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 text-muted" /> Make public
              </>
            )}
          </button>
          <button
            onClick={del}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-surface-2"
          >
            <Trash2 className="h-4 w-4" /> Delete post
          </button>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-text">Edit post</h3>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={`mt-4 ${fieldClass}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
              >
                Cancel
              </button>
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
