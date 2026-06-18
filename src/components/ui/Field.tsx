import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Shared form styling — one source of truth across every form in the app. */
export const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-ring";
export const labelClass = "mb-1.5 block text-sm font-medium text-text";
/** Small secondary/inline button (e.g. chips, add-row, quote actions). */
export const subtleBtnClass =
  "inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-2";

/** Labeled field wrapper: <Field label hint>{control}</Field>. */
export function Field({
  label,
  hint,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${fieldClass} ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`${fieldClass} ${className}`} {...rest}>
      {children}
    </select>
  );
}
