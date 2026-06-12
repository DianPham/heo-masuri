"use client";

import { useEffect, useState } from "react";

/**
 * Reactive media-query hook. Returns false during SSR / first render so the
 * tree always hydrates to the mobile branch (consistent across server and
 * client), then flips to the real value on the next tick. Callers that show
 * different content per breakpoint should accept a one-tick flash on first
 * paint — it's a deliberate consistency-over-flash trade.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
