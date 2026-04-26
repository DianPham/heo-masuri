"use client";

import { useEffect, createContext, useContext, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Who } from "@/lib/soft-gate";

export type RealtimeEvent =
  | { event: "missing:new"; payload: { id: string; intensity: number; count_today: number } }
  | { event: "missing:ack"; payload: { id: string } }
  | { event: "thinking:new"; payload: { id: string; kind: string; from: string; from_name: string } }
  | { event: "angry:new"; payload: { id: string; need_type: string } }
  | { event: "angry:reply"; payload: { id: string; reply: string } }
  | { event: "angry:resolved"; payload: { id: string } }
  | { event: "reunion:updated"; payload: { target_date: string } };

type Listener = (e: RealtimeEvent) => void;

const RealtimeContext = createContext<{
  addListener: (fn: Listener) => () => void;
} | null>(null);

export function RealtimeProvider({
  who,
  children,
}: {
  who: Who;
  children: React.ReactNode;
}) {
  const [listeners] = useState<Set<Listener>>(() => new Set());

  const addListener = useCallback(
    (fn: Listener) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    [listeners]
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

    // Suppress unused warning — `who` is available for future filtering
    void who;

    return () => {
      supabase.removeChannel(ch);
    };
  }, [who, listeners]);

  return (
    <RealtimeContext.Provider value={{ addListener }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(listener: Listener) {
  const ctx = useContext(RealtimeContext);
  useEffect(() => {
    if (!ctx) return;
    return ctx.addListener(listener);
  }, [ctx, listener]);
}
