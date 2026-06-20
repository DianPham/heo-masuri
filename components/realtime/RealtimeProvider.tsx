"use client";

import { useEffect, useRef, createContext, useContext, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Who } from "@/lib/soft-gate";
import { ActivityToast } from "./ActivityToast";

export type RealtimeEvent =
  | { event: "missing:new"; payload: { id: string; intensity: number; count_today: number } }
  | { event: "missing:ack"; payload: { id: string } }
  | { event: "thinking:new"; payload: { id: string; kind: string; from: string; from_name: string } }
  | { event: "angry:new"; payload: { id: string; need_type: string } }
  | { event: "angry:reply"; payload: { id: string; reply: string } }
  | { event: "angry:resolved"; payload: { id: string } }
  | { event: "reunion:updated"; payload: { target_date: string | null } }
  | { event: "heo:studying"; payload: { card_index: number; total: number; page_title: string } }
  | {
      event: "activity:new";
      payload: { actor_slug: "heo" | "masuri" | null; icon: string; message: string; url: string | null };
    };

type Listener = (e: RealtimeEvent) => void;

const RealtimeContext = createContext<{
  addListener: (fn: Listener) => () => void;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
} | null>(null);

export function RealtimeProvider({
  who,
  children,
}: {
  who: Who;
  children: React.ReactNode;
}) {
  const [listeners] = useState<Set<Listener>>(() => new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addListener = useCallback(
    (fn: Listener) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    [listeners]
  );

  // Expose a send function so any component can broadcast on the shared channel.
  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      channelRef.current?.send({ type: "broadcast", event, payload });
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("couple")
      .on("broadcast", { event: "*" }, ({ event, payload }) => {
        const e = { event, payload } as RealtimeEvent;
        listeners.forEach((fn) => fn(e));
      })
      .subscribe();

    channelRef.current = ch;

    // Suppress unused warning — `who` is available for future filtering
    void who;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [who, listeners]);

  return (
    <RealtimeContext.Provider value={{ addListener, broadcast }}>
      {children}
      {/* Mounted here so the shared-feature activity toast is present on every
         authenticated page (calendar/dates/wardrobe/notebook all wrap in this
         provider), not just the home shells. */}
      {who === "heo" || who === "masuri" ? <ActivityToast who={who} /> : null}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeBroadcast() {
  const ctx = useContext(RealtimeContext);
  // Return a no-op if used outside provider (e.g. during SSR)
  return ctx?.broadcast ?? (() => {});
}

export function useRealtime(listener: Listener) {
  const ctx = useContext(RealtimeContext);
  useEffect(() => {
    if (!ctx) return;
    return ctx.addListener(listener);
  }, [ctx, listener]);
}
