"use client";

import { useEffect } from "react";

/** Silently marks a letter as seen when Heo opens it. */
export function LetterSeenMarker({ id }: { id: string }) {
  useEffect(() => {
    fetch(`/api/notebook/letter/${id}/seen`, { method: "POST" }).catch(() => {});
  }, [id]);
  return null;
}
