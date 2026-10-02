"use client";

import { type ReactNode } from "react";
import { useInView } from "@/lib/motion";

type RevealVariant = "up" | "fade" | "left" | "right" | "scale" | "img";

type RevealProps = {
  children: ReactNode;
  /** animation flavor */
  variant?: RevealVariant;
  /** ms delay */
  delay?: number;
  className?: string;
  /** element/tag to render */
  as?: "div" | "section" | "article" | "li" | "span" | "figure" | "header" | "footer";
  threshold?: number;
};

/**
 * Scroll reveal wrapper — adds .is-in once, via IntersectionObserver.
 * Initial hidden state is gated behind html.js (set by an inline script),
 * so users without JS always see full content. Reduced motion is handled in CSS.
 */
export function Reveal({ children, variant = "up", delay = 0, className, as = "div", threshold }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>(threshold ?? 0.16);
  const Tag = as;

  const dataAttrs: Record<string, string> =
    variant === "fade" || variant === "left" || variant === "right" || variant === "scale" || variant === "img"
      ? { "data-reveal": variant }
      : { "data-reveal": "up" };

  return (
    <Tag
      ref={ref as never}
      className={`${inView ? "is-in" : ""} ${className ?? ""}`}
      style={delay ? ({ ["--rvd" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
      {...dataAttrs}
    >
      {children}
    </Tag>
  );
}

/** Headline line-reveal on scroll: pass lines as children array. */
export function RevealLines({ lines, className }: { lines: ReactNode[]; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.3);
  return (
    <span ref={ref} className={`rl-scroll ${inView ? "is-in" : ""} ${className ?? ""}`}>
      {lines.map((line, i) => (
        <span key={i} className="rl" style={{ ["--i" as string]: i } as React.CSSProperties}>
          <span>{line}</span>
        </span>
      ))}
    </span>
  );
}

/** Container that staggers its direct children when in view. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.12, "0px 0px -4% 0px");
  const Tag = as;
  return (
    <Tag ref={ref as never} className={`stagger ${inView ? "is-in" : ""} ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
