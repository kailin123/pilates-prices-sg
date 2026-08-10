"use client";

import { useState } from "react";
import type { Studio } from "@/lib/types";

/** Studio logo tile. Falls back to a single generic placeholder (same for every
 *  studio) when there's no logo or it fails to load — so a missing logo never
 *  looks like it could be the studio's real mark. */
export default function StudioLogo({ studio, size = "md" }: { studio: Studio; size?: "sm" | "md" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "sm" ? "h-9 w-9 rounded-md" : "h-12 w-12 rounded-lg";
  const pad = size === "sm" ? "p-1" : "p-1.5";

  if (studio.logo && !broken) {
    return (
      <div className={`flex ${box} shrink-0 items-center justify-center overflow-hidden border border-line bg-white ${pad}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={studio.logo}
          alt={`${studio.name} logo`}
          className="h-full w-full object-contain"
          onError={() => setBroken(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Generic placeholder — identical for all studios without a logo.
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center border border-line bg-panel-2`} aria-label={`${studio.name} (no logo)`}>
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-muted" fill="currentColor" aria-hidden>
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0z" />
      </svg>
    </div>
  );
}
