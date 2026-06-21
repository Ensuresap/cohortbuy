"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to `value` once it scrolls into view. Respects reduced-motion. */
export default function CountUp({
  value,
  prefix = "",
  suffix = "",
  durationMs = 1400,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setN(value);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !done.current) {
        done.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - t0) / durationMs, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);

  return <span ref={ref} className={className}>{prefix}{n.toLocaleString()}{suffix}</span>;
}
