"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { submitJoinRequest } from "@/app/cohorts/actions";
import SafetyNote from "./SafetyNote";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

type Q = { text: string; expected?: string };

export default function JoinButton({
  cohortId,
  handle,
  questions,
}: {
  cohortId: string;
  handle: string;
  questions: Q[];
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = questions.map((q, i) => ({ question: q.text, answer: answers[i] ?? "" }));
    const res = await submitJoinRequest({ cohortId, handle, answers: payload });
    if (!res.ok) {
      setError(res.error || "Couldn't submit your request.");
      setBusy(false);
      return;
    }
    setOpen(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Request to join</Button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-text">Request to join</h3>
            <p className="mt-1 text-sm text-muted">
              The cohort admins review every request{questions.length > 0 ? " — please answer a few questions." : "."}
            </p>
            <div className="mt-3">
              <SafetyNote />
            </div>
            <form onSubmit={submit} className="mt-4 space-y-4">
              {questions.map((q, i) => (
                <div key={i}>
                  <label className="mb-1 block text-sm font-medium text-text">{q.text}</label>
                  <textarea
                    value={answers[i] ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => {
                        const n = [...a];
                        n[i] = e.target.value;
                        return n;
                      })
                    }
                    rows={2}
                    className={fieldClass}
                  />
                </div>
              ))}
              {error && <p className="text-sm text-accent">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
