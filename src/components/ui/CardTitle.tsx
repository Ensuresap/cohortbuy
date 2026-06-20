import type { ReactNode } from "react";

/** Section/card title with the brand green underline rule (consistent across cards). */
export default function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 border-b-2 border-primary/15 pb-2.5">
      <h2 className="font-display text-lg font-semibold text-text">{children}</h2>
      {right}
    </div>
  );
}
