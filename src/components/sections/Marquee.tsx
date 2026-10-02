import { Icon, type IconName } from "@/components/ui/Icon";

const WORDS: Array<{ label: string; icon: IconName }> = [
  { label: "Bilim", icon: "book" },
  { label: "Tarbiya", icon: "heart" },
  { label: "Sport", icon: "ball" },
  { label: "Ijod", icon: "palette" },
  { label: "Texnologiya", icon: "monitor" },
  { label: "Inklyuziya", icon: "users" },
  { label: "Til ta’limi", icon: "globe" },
  { label: "Kelajak", icon: "trend" },
];

/** Marquee value strip — decorative; pauses on hover; static under reduced motion. */
export function Marquee() {
  const track = (ariaHidden: boolean) => (
    <div className="marquee-track" aria-hidden={ariaHidden || undefined}>
      {WORDS.map((w) => (
        <span key={w.label} className="flex items-center gap-3 py-5 font-display text-[1.05rem] font-extrabold uppercase tracking-[0.08em] text-muted">
          <Icon name={w.icon} size={20} className="text-[color:var(--accent-ink)]" />
          {w.label}
          <span aria-hidden="true" className="ml-5 text-line-strong">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="border-y border-line bg-[color:var(--surface)]" role="presentation">
      <div className="marquee">
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
