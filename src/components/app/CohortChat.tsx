"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import MarkdownLite from "@/components/ui/MarkdownLite";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi! I'm the CohortBuy helper. Neighbors here team up to **save on home projects** — and you can earn tokens by pulling your neighbors in. Want to see how it works?";

const QUICK = [
  "How much can I save?",
  "How does it work?",
  "How do I invite my neighbors?",
  "How do I start one for my street?",
];

export default function CohortChat() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const done = typeof window !== "undefined" && localStorage.getItem("cb-chat-seen");
    if (done) return;
    setDismissed(false);
    const t = setTimeout(() => setTeaser(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function markSeen() {
    try { localStorage.setItem("cb-chat-seen", "1"); } catch { /* ignore */ }
  }
  function openChat() {
    setOpen(true);
    setTeaser(false);
    markSeen();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.role !== "assistant" || m.content !== GREETING) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "Sorry, I couldn't answer that — try browsing cohorts or the guides." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network hiccup — please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          {teaser && !dismissed && (
            <div className="max-w-[16rem] rounded-2xl border border-border bg-surface p-3 text-sm text-text shadow-lg">
              <button onClick={() => { setTeaser(false); setDismissed(true); markSeen(); }} className="float-right -mt-1 text-subtle hover:text-text" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="pr-3">Curious how much your street could save together?</p>
              <button onClick={openChat} className="mt-2 text-xs font-semibold text-primary hover:underline">Ask me →</button>
            </div>
          )}
          <button
            onClick={openChat}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary-hover"
            aria-label="Open CohortBuy helper"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
            <span className="flex items-center gap-2 font-medium text-text">
              <Sparkles className="h-4 w-4 text-primary" /> CohortBuy helper
            </span>
            <button onClick={() => setOpen(false)} className="text-subtle hover:text-text" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={"max-w-[85%] rounded-2xl px-3 py-2 text-sm " + (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-text")}>
                  {m.role === "assistant" ? <MarkdownLite text={m.content} /> : m.content}
                </div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="rounded-2xl bg-surface-2 px-3 py-2 text-sm text-subtle">…</div></div>}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text hover:bg-surface-2">{q}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-border px-3 pt-2.5">
            <a href="/cohorts" className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15">Browse cohorts</a>
            <a href="/guides" className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15">Guides</a>
            <a href="/cohorts/new" className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15">Start a cohort</a>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about saving with neighbors…"
              className="h-10 flex-1 rounded-full border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" disabled={busy || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-subtle">On-topic help only · don&rsquo;t share passwords or card numbers</p>
        </div>
      )}
    </>
  );
}
