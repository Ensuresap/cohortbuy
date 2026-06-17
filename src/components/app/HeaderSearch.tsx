import { Search } from "lucide-react";

/**
 * Global search in the app header. Plain GET form to /cohorts so it works
 * without JS. Scope is cohorts today; services & products are planned, hence
 * the forward-looking placeholder.
 */
export default function HeaderSearch({
  defaultValue = "",
  className = "",
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action="/cohorts" role="search" className={`relative ${className}`}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        aria-label="Search cohorts, services, and products"
        placeholder="Search cohorts, services, products…"
        className="min-h-touch w-full rounded-full border border-border bg-surface-2 py-2 pl-9 pr-4 text-sm text-text outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-ring"
      />
    </form>
  );
}
