"use client";

import { useCountUp, useInView } from "@/lib/motion";

/**
 * Count-up number — animates once when entering the viewport.
 * Gentle ease-out; reduced-motion users get the final value instantly.
 * `compact` renders the small inline variant used inside the intro section.
 */
export function StatCounter({
  value,
  suffix = "",
  label,
  compact = false,
}: {
  value: number;
  suffix?: string;
  label: string;
  compact?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const current = useCountUp(value, inView);

  if (compact) {
    return (
      <div ref={ref}>
        <div className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-extrabold leading-none tracking-tight">
          {current.toLocaleString("ru-RU")}
          <span className="text-[color:var(--accent-ink)]">{suffix}</span>
        </div>
        <div className="mt-2 text-[0.78rem] font-bold leading-snug text-muted">{label}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className="text-center sm:text-left">
      <div className="font-display text-[clamp(2.6rem,4.6vw,3.9rem)] font-extrabold leading-none tracking-tight">
        {current.toLocaleString("ru-RU")}
        <span className="text-[color:var(--accent-ink)]">{suffix}</span>
      </div>
      <div className="mt-3 text-[0.95rem] font-bold">{label}</div>
    </div>
  );
}
