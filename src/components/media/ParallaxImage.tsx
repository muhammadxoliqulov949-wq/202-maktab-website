"use client";

import Image from "next/image";
import { useParallax } from "@/lib/motion";

/**
 * Scroll-linked parallax image — the inner bitmap drifts gently while the
 * frame clips it. Disabled for reduced-motion / touch by useParallax itself.
 */
export function ParallaxImage({
  src,
  alt,
  sizes,
  priority = false,
  overscan = "8%",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  overscan?: string;
}) {
  const ref = useParallax<HTMLDivElement>(0.07);
  return (
    <div ref={ref} className="absolute inset-x-0" style={{ top: `-${overscan}`, bottom: `-${overscan}` }}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
