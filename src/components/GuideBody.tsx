import type { ReactNode } from "react";

type Block =
  | { type: "h2" | "h3"; text: string }
  | { type: "hr" }
  | { type: "ul" | "ol" | "quote"; items: string[] }
  | { type: "p"; text: string };

/** Tokenize lightweight markdown into typed blocks — robust to missing blank lines. */
function tokenize(body: string): Block[] {
  const out: Block[] = [];
  let cur: { type: "ul" | "ol" | "quote" | "p"; items: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    if (cur.type === "p") out.push({ type: "p", text: cur.items.join(" ") });
    else out.push({ type: cur.type, items: cur.items });
    cur = null;
  };
  for (const raw of body.split("\n")) {
    const t = raw.trim();
    if (t === "") { flush(); continue; }
    if (t === "---") { flush(); out.push({ type: "hr" }); continue; }
    if (/^###\s+/.test(t)) { flush(); out.push({ type: "h3", text: t.replace(/^###\s+/, "") }); continue; }
    if (/^#{1,2}\s+/.test(t)) { flush(); out.push({ type: "h2", text: t.replace(/^#{1,2}\s+/, "") }); continue; }
    if (/^>\s?/.test(t)) { if (cur?.type !== "quote") { flush(); cur = { type: "quote", items: [] }; } cur.items.push(t.replace(/^>\s?/, "")); continue; }
    if (/^[-*]\s+/.test(t)) { if (cur?.type !== "ul") { flush(); cur = { type: "ul", items: [] }; } cur.items.push(t.replace(/^[-*]\s+/, "")); continue; }
    if (/^\d+[.)]\s+/.test(t)) { if (cur?.type !== "ol") { flush(); cur = { type: "ol", items: [] }; } cur.items.push(t.replace(/^\d+[.)]\s+/, "")); continue; }
    if (cur?.type !== "p") { flush(); cur = { type: "p", items: [] }; }
    cur.items.push(t);
  }
  flush();
  return out;
}

export default function GuideBody({ body }: { body: string }) {
  const blocks = tokenize(body);
  let leadUsed = false;
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        const isLead = !leadUsed && b.type === "p";
        if (isLead) leadUsed = true;
        return render(b, i, isLead);
      })}
    </div>
  );
}

function render(b: Block, key: number, lead: boolean): ReactNode {
  switch (b.type) {
    case "hr":
      return <hr key={key} className="my-10 border-t border-border" />;
    case "h2":
      return <h2 key={key} className="!mt-10 font-display text-2xl font-semibold tracking-tight text-text">{inline(b.text)}</h2>;
    case "h3":
      return <h3 key={key} className="!mt-8 font-display text-xl font-semibold text-text">{inline(b.text)}</h3>;
    case "quote":
      return (
        <blockquote key={key} className="border-l-4 border-primary/40 bg-primary/5 px-5 py-3 font-display text-lg italic text-text">
          {inline(b.items.join(" "))}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={key} className="space-y-2.5 pl-1">
          {b.items.map((l, j) => (
            <li key={j} className="flex gap-3 text-lg leading-relaxed text-muted">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{inline(l)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="space-y-2.5">
          {b.items.map((l, j) => (
            <li key={j} className="flex gap-3 text-lg leading-relaxed text-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{j + 1}</span>
              <span className="pt-0.5">{inline(l)}</span>
            </li>
          ))}
        </ol>
      );
    default:
      return <p key={key} className={lead ? "text-xl leading-relaxed text-text" : "text-lg leading-relaxed text-muted"}>{inline(b.text)}</p>;
  }
}

function inline(s: string): ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-text">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} className="font-medium text-primary underline">{link[1]}</a>;
    return <span key={i}>{p}</span>;
  });
}
