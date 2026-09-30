"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Article share — Web Share API with clipboard fallback + honest toast. */
export function ShareControl({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}/news/${slug}` : `/news/${slug}`;

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user dismissed — fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button type="button" className="icon-btn relative" onClick={share} aria-label="Maqolani ulashish" title="Ulashish">
      <Icon name={copied ? "check" : "arrow-up-right"} size={19} />
      {copied ? (
        <span
          role="status"
          className="absolute left-1/2 top-full mt-2 w-max -translate-x-1/2 rounded-xl bg-[color:var(--primary)] px-3 py-1.5 text-[0.75rem] font-bold text-[color:var(--primary-contrast)] shadow-lg"
        >
          Havola nusxalandi
        </span>
      ) : null}
    </button>
  );
}
