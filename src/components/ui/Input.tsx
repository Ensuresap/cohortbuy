import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-ring ${className}`}
        {...props}
      />
    );
  }
);
