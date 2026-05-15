"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter, usePathname } from "next/navigation";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import type { RealtimeEvent } from "@/components/realtime/RealtimeProvider";

interface AngryIncomingProps {
  who: "heo" | "masuri";
}

interface Toast {
  message: string;
  href?: string;
}

const REPLY_LABELS: Record<string, string> = {
  sorry:      "Xin lỗi em 🙏",
  on_my_way:  "Anh đang đến 🏃",
  talk_in_10: "10 phút nữa mình nói chuyện nhé 💬",
  heard_you:  "Anh nghe em rồi 💕",
};

export function AngryIncoming({ who }: AngryIncomingProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState<Toast | null>(null);

  // Auto-dismiss after 10 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 10_000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    // Masuri: in-app alert when Heo sends an angry signal
    if (who === "masuri" && e.event === "angry:new") {
      setToast({
        message: "Heo đang không ổn 💔 — nhấn để xem",
        href: `/masuri/angry/${e.payload.id}`,
      });
    }
    // Heo: in-app reply notification when not already on the active buzz page
    if (who === "heo" && e.event === "angry:reply") {
      if (pathname?.startsWith("/heo/angry/")) return;
      const label = REPLY_LABELS[e.payload.reply] ?? e.payload.reply;
      setToast({
        message: `Masuri trả lời: ${label}`,
        href: `/heo/angry/${e.payload.id}`,
      });
    }
  }, [who, pathname]);

  useRealtime(handleRealtime);

  function handleClick() {
    if (toast?.href) router.push(toast.href);
    setToast(null);
  }

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key="angry-incoming"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-auto"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          onClick={handleClick}
        >
          <div
            className="flex items-center gap-3 bg-rose-50 border-2 border-rose-300 rounded-2xl px-4 py-3 max-w-xs w-full"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.30)" }}
          >
            <span className="text-2xl shrink-0">💔</span>
            <p className="font-body text-sm font-semibold text-ink leading-snug flex-1">
              {toast.message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
