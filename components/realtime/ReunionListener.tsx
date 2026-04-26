"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "./RealtimeProvider";
import type { RealtimeEvent } from "./RealtimeProvider";

export function ReunionListener() {
  const router = useRouter();

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event !== "reunion:updated") return;
    router.refresh();
  }, [router]);

  useRealtime(handleRealtime);
  return null;
}
