"use client";

import { useRef, useState } from "react";
import { Sparkles, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field, Textarea, Select, fieldClass } from "@/components/ui/Field";
import { createRequestAction } from "@/app/requests/actions";

type Msg = { role: "user" | "assistant"; content: string };
type Proposal = {
  title: string;
  category?: string;
  projectType: "service" | "group_buy";
  serviceScope: "service" | "equipment" | "both";
  splitMethod: "even" | "by_quantity" | "by_usage" | "custom";
  minSize: number;
  driver?: string;
  fit: "good" | "maybe" | "poor";
  fitReason?: string;
};

const GREETING =
  "Hi! I'm the CohortBuy advisor. Tell me what you're thinking of organising with your neighbours — even a rough idea — and I'll help figure out if it's a good fit and shape it into a project.";

export default function AdvisorChat({ cohortId, handle }: { cohortId: string; handle: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setProposal(null);
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cohortId, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong.");
      } else if (data.proposal) {
        setProposal(data.proposal as Proposal);
      } else if (data.message) {
        setMsgs((m) => [...m, { role: "assistant", content: data.message }]);
      }
    } catch {
      setError("Couldn't reach the advisor. Try again.");
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <Bubble role="assistant">{GREETING}</Bubble>
        {msgs.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {loading && <p className="text-sm text-subtle">Thinking…</p>}
        {error && (
          <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
        )}
        <div ref={endRef} />
      </div>

      {!proposal && (
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="e.g. A few of us want our driveways resealed…"
            className={fieldClass}
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="gap-1.5">
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      )}

      {proposal && <ProposalCard proposal={proposal} cohortId={cohortId} handle={handle} onReject={() => setProposal(null)} />}
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex items-start gap-2"}>
      {!mine && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
      )}
      <div
        className={
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " +
          (mine ? "bg-primary text-primary-foreground" : "bg-surface-2 text-text")
        }
      >
        {children}
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  cohortId,
  handle,
  onReject,
}: {
  proposal: Proposal;
  cohortId: string;
  handle: string;
  onReject: () => void;
}) {
  const fitTone =
    proposal.fit === "good"
      ? "bg-primary/10 text-primary"
      : proposal.fit === "maybe"
        ? "bg-surface-2 text-text"
        : "bg-accent/10 text-accent";
  return (
    <div className="rounded-2xl border border-primary/30 bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold text-text">Proposed setup</h3>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${fitTone}`}>
          {proposal.fit === "good" ? "Good fit" : proposal.fit === "maybe" ? "Worth a try" : "Reconsider"}
        </span>
      </div>
      {proposal.fitReason && <p className="mt-1 text-sm text-muted">{proposal.fitReason}</p>}

      <form action={createRequestAction} className="mt-4 space-y-3">
        <input type="hidden" name="cohortId" value={cohortId} />
        <input type="hidden" name="handle" value={handle} />
        <Field label="Project title" htmlFor="adv-title">
          <Input id="adv-title" name="title" required defaultValue={proposal.title} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" htmlFor="adv-cat" optional>
            <Input id="adv-cat" name="category" defaultValue={proposal.category ?? ""} />
          </Field>
          <Field label="Min group size" htmlFor="adv-min">
            <Input id="adv-min" name="minSize" type="number" min={1} max={100} defaultValue={proposal.minSize} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Type" htmlFor="adv-type">
            <Select id="adv-type" name="projectType" defaultValue={proposal.projectType}>
              <option value="service">Service</option>
              <option value="group_buy">Group buy</option>
            </Select>
          </Field>
          <Field label="Includes" htmlFor="adv-scope">
            <Select id="adv-scope" name="serviceScope" defaultValue={proposal.serviceScope}>
              <option value="service">Service only</option>
              <option value="equipment">Equipment only</option>
              <option value="both">Equipment + install</option>
            </Select>
          </Field>
          <Field label="Split" htmlFor="adv-split">
            <Select id="adv-split" name="splitMethod" defaultValue={proposal.splitMethod}>
              <option value="even">Even</option>
              <option value="by_quantity">By quantity</option>
              <option value="by_usage">By usage</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>
        </div>
        <Field label="Why now — the driver" htmlFor="adv-driver" optional>
          <Textarea id="adv-driver" name="driver" rows={2} defaultValue={proposal.driver ?? ""} />
        </Field>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={onReject} className="text-sm font-medium text-subtle hover:text-text">
            ← Keep chatting
          </button>
          <Button type="submit" className="gap-1.5">
            Create project <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
