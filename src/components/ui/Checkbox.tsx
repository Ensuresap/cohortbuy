import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className = "", id, ...props },
  ref
) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-touch cursor-pointer items-center gap-3 text-text"
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={`h-5 w-5 rounded-md border-border accent-[rgb(var(--primary))] focus:ring-2 focus:ring-ring ${className}`}
        {...props}
      />
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
});
