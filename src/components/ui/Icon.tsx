import type { SVGProps } from "react";

/**
 * Inline icon set — 24×24 grid, stroke = currentColor.
 * One file so icons stay consistent and tree-shakable per name.
 */
export type IconName =
  | "arrow-right"
  | "arrow-up-right"
  | "arrow-down"
  | "menu"
  | "close"
  | "chevron-down"
  | "search"
  | "phone"
  | "mail"
  | "pin"
  | "clock"
  | "telegram"
  | "instagram"
  | "play"
  | "check"
  | "alert"
  | "globe"
  | "moon"
  | "sun"
  | "users"
  | "user"
  | "building"
  | "teacher"
  | "heart"
  | "book"
  | "library"
  | "monitor"
  | "ball"
  | "star"
  | "graduation"
  | "clipboard"
  | "calendar"
  | "file"
  | "chat"
  | "atom"
  | "palette"
  | "handshake"
  | "trend"
  | "route"
  | "eye"
  | "arrow-left"
  | "arrow-up";

const P: Record<IconName, React.ReactNode> = {
  "arrow-right": <path d="M4 12h15m0 0-6-6m6 6-6 6" />,
  "arrow-left": <path d="M20 12H5m0 0 6-6m-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7m0 0H8m9 0v9" />,
  "arrow-up": <path d="M12 20V4m0 0-6 6m6-6 6 6" />,
  "arrow-down": <path d="M12 4v16m0 0 6-6m-6 6-6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  phone: <path d="M6.6 3h2.8l1.4 4-2 1.4a12 12 0 0 0 5.8 5.8l1.4-2 4 1.4v2.8A2.6 2.6 0 0 1 17.4 19 14.4 14.4 0 0 1 5 6.6 2.6 2.6 0 0 1 6.6 3Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  telegram: <path d="M21 4 3.6 10.8c-.9.35-.85 1.65.1 1.9l4.4 1.2 1.6 4.9c.3.9 1.5 1 2 .25l2.3-3.2 4.3 3.2c.8.6 1.9.15 2.1-.85L23 5.2c.2-1-.9-1.7-2-1.2ZM8.5 13.7l8.7-6.2-6.9 7 .1 3" style={{ strokeLinejoin: "round" }} />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V13m0 3.4v.1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5S9.4 5.8 12 3.5Z" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3.5 20c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M16.2 14.6c2.3.2 3.8 1.7 4.3 4.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.8 20c.8-3.6 3.4-5.6 7.2-5.6s6.4 2 7.2 5.6" />
    </>
  ),
  building: <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21m0-11h4.5A1.5 1.5 0 0 1 20 11.5V21M3 21h18M7.5 8h3m-3 4h3m-3 4h3m6.5 0h1" />,
  teacher: (
    <>
      <path d="M3 7.5 12 4l9 3.5-9 3.5-9-3.5Z" />
      <path d="M6.5 9.8v4.7c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8V9.8M20.5 8.5v5.5" />
    </>
  ),
  heart: <path d="M12 20.5s-7.6-4.7-9.1-9.3C1.8 7.8 4 4.9 7 4.9c2 0 3.6 1 5 3 1.4-2 3-3 5-3 3 0 5.2 2.9 4.1 6.3-1.5 4.6-9.1 9.3-9.1 9.3Z" />,
  book: <path d="M5 4.5h5.5A2.5 2.5 0 0 1 13 7v13a3 3 0 0 0-3-3H5v-13Zm14 0h-5.5A2.5 2.5 0 0 0 11 7v13a3 3 0 0 1 3-3h5.5v-13Z" />,
  library: <path d="M5 4v16M5 4h3a4 4 0 0 1 0 8H5m3 0a4 4 0 0 1 0 8H5m9-16h6v16h-6m6-9h-6" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
      <path d="M9 21h6m-3-4v4" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17M6 6c3.5 3.2 8.5 3.2 12 0M6 18c3.5-3.2 8.5-3.2 12 0" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />,
  graduation: (
    <>
      <path d="m2.5 9 9.5-4 9.5 4-9.5 4-9.5-4Z" />
      <path d="M6.5 11v4.5c0 1.3 2.5 2.7 5.5 2.7s5.5-1.4 5.5-2.7V11M21 9.5v5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5A2.5 2.5 0 0 1 11.5 2h1A2.5 2.5 0 0 1 15 4.5M9 10h6m-6 4h6m-6 4h3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4m8-4v4M8 14h2m4 0h2" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v4h4M9.5 12h5m-5 4h5" />
    </>
  ),
  chat: <path d="M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H10L5.5 21v-4.5h-.0A2.5 2.5 0 0 1 4 14V6Z" />,
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 3.5c4.7 3 4.7 14 0 17-4.7-3-4.7-14 0-17Zm0 0c4.7 3 4.7 14 0 17" />
      <path d="M4.6 7.8c5.5-1.2 13 3.8 14.8 8.4-5.5 1.2-13-3.8-14.8-8.4Z" />
      <path d="M19.4 7.8c-5.5-1.2-13 3.8-14.8 8.4 5.5 1.2 13-3.8 14.8-8.4Z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.6 3.4-3.4 3.4h-2a1.8 1.8 0 0 0-1.3 3.1c.5.6.2 2.5-2.3 2.5Z" />
      <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  handshake: <path d="m3 8 4-2 5 1.5L17 6l4 2v6l-5.5 4.5L12 16l-3.5 2.5L3 14V8Zm9 -.5-4.5 4a1.7 1.7 0 0 0 2.3 2.4l2.2-1.9m2 .5 2 1.7a1.7 1.7 0 0 0 2.3-2.4" />,
  trend: <path d="M3.5 17.5 9 12l3.5 3.5 8-8m0 0h-5m5 0v5" />,
  route: (
    <>
      <circle cx="6" cy="18.5" r="2.2" />
      <circle cx="18" cy="5.5" r="2.2" />
      <path d="M8.2 18.5h6.3a3 3 0 0 0 0-6H9.5a3 3 0 0 1 0-6h6.3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export function Icon({ name, size = 20, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
