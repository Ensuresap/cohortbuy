import type { ReactNode } from "react";

/** Renders a guide's lightweight markdown into well-formatted article elements. */
export default function GuideBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n{2,}/);
  let firstPara = true;
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        const isLead = firstPara && !/^(#{2,3}\s|[-*]\s|\d+[.)]\s|>\s|---)/.test(b);
        if (isLead) firstPara = false;
        return renderBlock(b, i, isLead);
      })}
    </div>
  );
}

function renderBlock(block: string, key: number, lead: boolean): ReactNode {
  const lines = block.split("\n");

  if (block.trim() === "---") {
    return <hr key={key} className="my-10 border-t border-border" />;
  }
  if (/^##\s+/.test(lines[0]) && lines.length === 1) {
    return (
      <h2 key={key} className="!mt-10 font-display text-2xl font-semibold tracking-tight text-text">
        {inline(lines[0].replace(/^##\s+/, ""))}
      </h2>
    );
  }
  if (/^###\s+/.test(lines[0]) && lines.length === 1) {
    return (
      <h3 key={key} className="!mt-8 font-display text-xl font-semibold text-text">
        {inline(lines[0].replace(/^###\s+/, ""))}
      </h3>
    );
  }
  if (lines.every((l) => /^>\s?/.test(l))) {
    return (
      <blockquote key={key} className="border-l-4 border-primary/40 bg-primary/5 px-5 py-3 font-display text-lg italic text-text">
        {inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}
      </blockquote>
    );
  }
  if (lines.length && lines.every((l) => /^\s*-\s+/.test(l))) {
    return (
      <ul key={key} className="space-y-2.5 pl-1">
        {lines.map((l, j) => (
          <li key={j} className="flex gap-3 text-lg leading-relaxed text-muted">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{inline(l.replace(/^\s*-\s+/, ""))}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
    return (
      <ol key={key} className="space-y-2.5">
        {lines.map((l, j) => (
          <li key={j} className="flex gap-3 text-lg leading-relaxed text-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{j + 1}</span>
            <span className="pt-0.5">{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <p key={key} className={lead ? "text-xl leading-relaxed text-text" : "text-lg leading-relaxed text-muted"}>
      {inline(block.replace(/\n/g, " "))}
    </p>
  );
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
