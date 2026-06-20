import type { ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer (no raw HTML). Handles paragraphs, bullet and
 * numbered lists, **bold**, *italic*, and `code`. Builds React nodes directly —
 * nothing is dangerouslySetInnerHTML'd, so it's injection-safe.
 */
export default function MarkdownLite({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={"space-y-2 text-sm leading-relaxed " + className}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split("\n");
  const isBullet = lines.every((l) => /^\s*[-*•]\s+/.test(l));
  const isNumbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));

  if (isBullet && lines.length) {
    return (
      <ul key={key} className="list-disc space-y-1 pl-5">
        {lines.map((l, j) => (
          <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
        ))}
      </ul>
    );
  }
  if (isNumbered && lines.length) {
    return (
      <ol key={key} className="list-decimal space-y-1 pl-5">
        {lines.map((l, j) => (
          <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>
        ))}
      </ol>
    );
  }
  // Heading shorthand (### Title) → bold line.
  if (/^#{1,6}\s+/.test(lines[0]) && lines.length === 1) {
    return (
      <p key={key} className="font-semibold text-text">
        {inline(lines[0].replace(/^#{1,6}\s+/, ""))}
      </p>
    );
  }
  return (
    <p key={key}>
      {lines.map((l, j) => (
        <span key={j}>
          {inline(l)}
          {j < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

function inline(s: string): ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-text">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-surface-2 px-1 py-0.5 text-[0.85em]">{p.slice(1, -1)}</code>;
    if (/^\*[^*]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}
