import type { ReactNode } from "react";

/** Renders a guide's lightweight markdown into semantic article elements. */
export default function GuideBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n{2,}/);
  return <div className="space-y-5">{blocks.map((b, i) => renderBlock(b, i))}</div>;
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split("\n");

  if (/^##\s+/.test(lines[0]) && lines.length === 1) {
    return (
      <h2 key={key} className="mt-8 font-display text-2xl font-semibold text-text">
        {inline(lines[0].replace(/^##\s+/, ""))}
      </h2>
    );
  }
  if (/^###\s+/.test(lines[0]) && lines.length === 1) {
    return (
      <h3 key={key} className="mt-6 font-display text-xl font-semibold text-text">
        {inline(lines[0].replace(/^###\s+/, ""))}
      </h3>
    );
  }
  if (lines.length && lines.every((l) => /^\s*-\s+/.test(l))) {
    return (
      <ul key={key} className="list-disc space-y-2 pl-6 text-muted">
        {lines.map((l, j) => <li key={j} className="leading-relaxed">{inline(l.replace(/^\s*-\s+/, ""))}</li>)}
      </ul>
    );
  }
  if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
    return (
      <ol key={key} className="list-decimal space-y-2 pl-6 text-muted">
        {lines.map((l, j) => <li key={j} className="leading-relaxed">{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}
      </ol>
    );
  }
  return <p key={key} className="text-lg leading-relaxed text-muted">{inline(block.replace(/\n/g, " "))}</p>;
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
