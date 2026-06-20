"use client";

/**
 * ActivityToast — live in-app toast for shared-feature actions (date plans,
 * ideas, wardrobe, important dates). Listens for the `activity:new` realtime
 * broadcast emitted server-side by lib/notify.ts → notifyPartner.
 *
 * Live-only: there's no persistence/replay (push is the durable channel). If
 * the partner's app is open they get a gentle toast; if closed, they got the
 * push. The toast is suppressed for the actor's own actions (filtered by
 * actor_slug) and queues sequentially so a burst doesn't stack.
 */
import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useRealtime, type RealtimeEvent } from "./RealtimeProvider";

type Who = "heo" | "masuri";

type Toast = { id: number; icon: string; message: string; url: string | null };

const VISIBLE_MS = 4200;
const GAP_MS = 400;

export function ActivityToast({ who }: { who: Who }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Toast | null>(null);
  const queueRef = useRef<Toast[]>([]);
  const playingRef = useRef(false);
  const seqRef = useRef(0);

  const drain = useCallback(() => {
    if (playingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    playingRef.current = true;
    setCurrent(next);
    setTimeout(() => {
      setCurrent(null);
      playingRef.current = false;
      setTimeout(drain, GAP_MS);
    }, VISIBLE_MS);
  }, []);

  const handle = useCallback(
    (e: RealtimeEvent) => {
      if (e.event !== "activity:new") return;
      // Ignore our own actions echoed back on the shared channel.
      if (e.payload.actor_slug === who) return;
      queueRef.current.push({
        id: ++seqRef.current,
        icon: e.payload.icon,
        message: e.payload.message,
        url: e.payload.url,
      });
      drain();
    },
    [who, drain]
  );

  useRealtime(handle);

  return (
    <AnimatePresence>
      {current && (
        <motion.button
          key={current.id}
          type="button"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-auto"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          onClick={() => {
            const url = current.url;
            setCurrent(null);
            playingRef.current = false;
            if (url) router.push(url);
            setTimeout(drain, GAP_MS);
          }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 max-w-xs w-full text-left"
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-hairline)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <span
              className="grid place-items-center w-9 h-9 rounded-xl flex-shrink-0 text-lg"
              style={{ background: "var(--color-accent-tint)" }}
              aria-hidden
            >
              {current.icon}
            </span>
            <p className="text-[13.5px] font-medium leading-snug flex-1" style={{ color: "var(--color-ink)" }}>
              {current.message}
            </p>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
