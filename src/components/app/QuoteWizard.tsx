"use client";

import { useRef, useState } from "react";
import { Plus, Mail, FileUp, PencilLine, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Field, Textarea, Select, fieldClass } from "@/components/ui/Field";
import { addQuoteAction } from "@/app/requests/actions";

type Fields = {
  vendorName: string;
  amount: string;
  currency: string;
  timeline: string;
  warranty: string;
  notes: string;
  kind: "indicative" | "final";
};
const EMPTY: Fields = { vendorName: "", amount: "", currency: "USD", timeline: "", warranty: "", notes: "", kind: "indicative" };

export default function QuoteWizard({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"method" | "input" | "review">("method");
  const [method, setMethod] = useState<"paste" | "upload" | "manual">("paste");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setStep("method");
    setText("");
    setError("");
    setFields(EMPTY);
  }

  async function extract(body: FormData) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/extract-quote", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't read a quote from that.");
        return;
      }
      const q = data.quote;
      setFields({
        vendorName: q.vendorName ?? "",
        amount: q.amount != null ? String(q.amount) : "",
        currency: q.currency ?? "USD",
        timeline: q.timeline ?? "",
        warranty: q.warranty ?? "",
        notes: q.notes ?? "",
        kind: q.kind === "final" ? "final" : "indicative",
      });
      setStep("review");
    } catch {
      setError("Something went wrong. Try again or enter it manually.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="md" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add quote
      </Button>

      {open && (
        <Modal title="Add a quote" onClose={close}>
          {/* Step: choose method */}
          {step === "method" && (
            <div className="space-y-2">
              <p className="-mt-2 mb-2 text-sm text-muted">How do you have the quote?</p>
              <MethodButton Icon={Mail} title="Paste the vendor's email" desc="AI reads it and fills the fields" onClick={() => { setMethod("paste"); setStep("input"); }} />
              <MethodButton Icon={FileUp} title="Upload a document" desc="PDF or text quote — AI extracts it" onClick={() => { setMethod("upload"); setStep("input"); }} />
              <MethodButton Icon={PencilLine} title="Enter it manually" desc="Type the details yourself" onClick={() => { setMethod("manual"); setFields(EMPTY); setStep("review"); }} />
            </div>
          )}

          {/* Step: input (paste or upload) */}
          {step === "input" && (
            <div className="space-y-3">
              <BackLink onClick={() => setStep("method")} />
              {method === "paste" ? (
                <Field label="Paste the vendor's email / quote" htmlFor="qtext">
                  <textarea id="qtext" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full message here…" className={fieldClass} />
                </Field>
              ) : (
                <Field label="Upload the quote (PDF or text)" htmlFor="qfile">
                  <input id="qfile" ref={fileRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-text" />
                </Field>
              )}
              {error && <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => { setFields(EMPTY); setStep("review"); }} className="text-sm font-medium text-subtle hover:text-text">
                  Skip — enter manually
                </button>
                <Button
                  onClick={() => {
                    const fd = new FormData();
                    if (method === "paste") fd.set("text", text);
                    else if (fileRef.current?.files?.[0]) fd.set("file", fileRef.current.files[0]);
                    extract(fd);
                  }}
                  disabled={busy || (method === "paste" ? !text.trim() : false)}
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" /> {busy ? "Reading…" : "Extract with AI"}
                </Button>
              </div>
            </div>
          )}

          {/* Step: review + save */}
          {step === "review" && (
            <form action={addQuoteAction} className="space-y-3">
              <BackLink onClick={() => setStep("method")} />
              {method !== "manual" && (
                <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted">
                  AI filled these from your {method === "paste" ? "email" : "document"} — check and correct before saving.
                </p>
              )}
              <input type="hidden" name="requestId" value={requestId} />
              <Field label="Vendor name" htmlFor="vendorName">
                <Input id="vendorName" name="vendorName" required defaultValue={fields.vendorName} />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Amount" htmlFor="amount"><Input id="amount" name="amount" type="number" step="0.01" min="0" required defaultValue={fields.amount} className="col-span-2" /></Field>
                <Field label="Currency" htmlFor="currency"><Input id="currency" name="currency" maxLength={3} defaultValue={fields.currency} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Timeline" htmlFor="timeline" optional><Input id="timeline" name="timeline" defaultValue={fields.timeline} /></Field>
                <Field label="Warranty" htmlFor="warranty" optional><Input id="warranty" name="warranty" defaultValue={fields.warranty} /></Field>
              </div>
              <Field label="Notes" htmlFor="notes" optional><Textarea id="notes" name="notes" rows={2} defaultValue={fields.notes} /></Field>
              <Field label="Kind" htmlFor="kind">
                <Select id="kind" name="kind" defaultValue={fields.kind}>
                  <option value="indicative">Indicative</option>
                  <option value="final">Final</option>
                </Select>
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">Cancel</button>
                <Button type="submit">Add quote</Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

function MethodButton({ Icon, title, desc, onClick }: { Icon: typeof Mail; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-surface-2">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-[18px] w-[18px]" /></span>
      <span>
        <span className="block font-medium text-text">{title}</span>
        <span className="block text-xs text-subtle">{desc}</span>
      </span>
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-mt-1 inline-flex items-center gap-1 text-sm font-medium text-subtle hover:text-text">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}
