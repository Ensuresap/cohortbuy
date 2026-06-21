"use client";

import { useState } from "react";
import { Package, Sparkles, PencilLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Field, Textarea, fieldClass } from "@/components/ui/Field";
import { setProductInfoAction } from "@/app/requests/actions";

type Fields = { name: string; url: string; specs: string; imageUrl: string };

export default function ProductWizard({
  requestId,
  initial,
  hasProduct,
}: {
  requestId: string;
  initial: Fields;
  hasProduct: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"method" | "input" | "review">("method");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Fields>(initial);

  function close() {
    setOpen(false);
    setStep("method");
    setText("");
    setError("");
    setFields(initial);
  }

  async function extract() {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("text", text);
      const res = await fetch("/api/extract-product", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't read a product from that.");
        return;
      }
      const p = data.product;
      setFields((f) => ({
        name: p.name ?? f.name,
        url: p.url || f.url,
        specs: p.specs || f.specs,
        imageUrl: f.imageUrl,
      }));
      setStep("review");
    } catch {
      setError("Something went wrong. Try again or enter it manually.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="md" variant={hasProduct ? "secondary" : "primary"} onClick={() => setOpen(true)} className="gap-1.5">
        <Package className="h-4 w-4" /> {hasProduct ? "Edit product" : "Add product"}
      </Button>

      {open && (
        <Modal title={hasProduct ? "Edit product" : "Add the product"} onClose={close}>
          {step === "method" && (
            <div className="space-y-2">
              <p className="-mt-2 mb-2 text-sm text-muted">How do you want to add it?</p>
              <button type="button" onClick={() => setStep("input")} className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-surface-2">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-[18px] w-[18px]" /></span>
                <span>
                  <span className="block font-medium text-text">Paste a product page or details</span>
                  <span className="block text-xs text-subtle">AI reads it and fills name, specs &amp; link</span>
                </span>
              </button>
              <button type="button" onClick={() => setStep("review")} className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-surface-2">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PencilLine className="h-[18px] w-[18px]" /></span>
                <span>
                  <span className="block font-medium text-text">Enter it manually</span>
                  <span className="block text-xs text-subtle">Type the product details yourself</span>
                </span>
              </button>
            </div>
          )}

          {step === "input" && (
            <div className="space-y-3">
              <BackLink onClick={() => setStep("method")} />
              <Field label="Paste the product page text or a description" htmlFor="ptext">
                <textarea id="ptext" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the product title, specs, price and link here…" className={fieldClass} />
              </Field>
              <p className="text-xs text-subtle">Tip: copy the product page contents (or paste the link plus a few specs). AI reads the text — it can&rsquo;t open the link itself.</p>
              {error && <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setStep("review")} className="text-sm font-medium text-subtle hover:text-text">Skip — enter manually</button>
                <Button onClick={extract} disabled={busy || !text.trim()} className="gap-1.5">
                  <Sparkles className="h-4 w-4" /> {busy ? "Reading…" : "Extract with AI"}
                </Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <form action={setProductInfoAction} className="space-y-3">
              <BackLink onClick={() => setStep("method")} />
              <input type="hidden" name="requestId" value={requestId} />
              <Field label="Product name" htmlFor="name">
                <Input id="name" name="name" required defaultValue={fields.name} placeholder="e.g. Lenovo IdeaPad Slim 5" />
              </Field>
              <Field label="Specs" htmlFor="specs" optional>
                <Textarea id="specs" name="specs" rows={2} defaultValue={fields.specs} placeholder="e.g. Ryzen 5, 16GB RAM, 512GB SSD, 15.6&quot; FHD" />
              </Field>
              <Field label="Product link" htmlFor="url" optional>
                <Input id="url" name="url" defaultValue={fields.url} placeholder="https://…" />
              </Field>
              <Field label="Image URL" htmlFor="imageUrl" optional>
                <Input id="imageUrl" name="imageUrl" defaultValue={fields.imageUrl} placeholder="https://… (optional)" />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">Cancel</button>
                <Button type="submit">Save product</Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-mt-1 inline-flex items-center gap-1 text-sm font-medium text-subtle hover:text-text">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}
