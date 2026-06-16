"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { submitPost } from "@/app/cohorts/actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function PostComposer({
  cohortId,
  handle,
}: {
  cohortId: string;
  handle: string;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) return;
    if (file && file.size > MAX_BYTES) {
      setError("Image must be under 5MB.");
      return;
    }
    setBusy(true);
    setError("");

    let imageUrl = "";
    try {
      if (file) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "jpg";
        const path = `posts/${cohortId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("cohort-media")
          .upload(path, file, { upsert: false });
        if (upErr) {
          setError(`Image upload failed: ${upErr.message}`);
          setBusy(false);
          return;
        }
        imageUrl = supabase.storage.from("cohort-media").getPublicUrl(path).data.publicUrl;
      }

      const res = await submitPost({ cohortId, handle, body, imageUrl });
      if (!res.ok) {
        setError(res.error || "Couldn't post.");
        setBusy(false);
        return;
      }
      // Reset
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setBusy(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-b border-border pb-5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Share an update with this cohort…"
        className={fieldClass}
      />
      {file && <p className="text-xs text-subtle">Selected: {file.name}</p>}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer rounded-xl border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-2">
          {file ? "Change image" : "Add image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex-1" />
        <Button type="submit" disabled={busy}>
          {busy ? "Posting…" : "Post"}
        </Button>
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
    </form>
  );
}
