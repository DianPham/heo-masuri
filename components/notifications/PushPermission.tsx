"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type PromptState = "hidden" | "pre-prompt" | "install-banner";

export function PushPermission() {
  const t = useTranslations("push");
  const [state, setState] = useState<PromptState>("hidden");

  const tryShow = useCallback(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (sessionStorage.getItem("push_later")) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;

    setState(isIOS && !isStandalone ? "install-banner" : "pre-prompt");
  }, []);

  useEffect(() => {
    window.addEventListener("push-eligible", tryShow);
    return () => window.removeEventListener("push-eligible", tryShow);
  }, [tryShow]);

  async function handleEnable() {
    setState("hidden");
    if (typeof Notification === "undefined") return;

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    try {
      const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pubKey) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
    } catch {}
  }

  function handleDismiss() {
    sessionStorage.setItem("push_later", "1");
    setState("hidden");
  }

  return (
    <AnimatePresence>
      {state !== "hidden" && (
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-28 left-4 right-4 z-50"
        >
          <div
            className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex flex-col gap-3 max-w-sm mx-auto"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.22)" }}
          >
            {state === "pre-prompt" ? (
              <>
                <div>
                  <p className="font-body text-sm font-semibold text-ink">
                    🔔 {t("prePromptTitle")}
                  </p>
                  <p className="font-body text-xs text-ink-soft mt-1 leading-relaxed">
                    {t("prePromptBody")}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleDismiss}
                    className="font-body text-xs text-ink-soft px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    {t("later")}
                  </button>
                  <button
                    onClick={handleEnable}
                    className="font-body text-xs font-semibold text-white bg-rose-400 px-4 py-1.5 rounded-lg hover:bg-rose-500 transition-colors"
                  >
                    {t("enable")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-body text-sm font-semibold text-ink">
                  📲 {t("installBanner")}
                </p>
                <p className="font-body text-xs text-ink-soft">1. {t("installStep1")}</p>
                <p className="font-body text-xs text-ink-soft">2. {t("installStep2")}</p>
                <button
                  onClick={handleDismiss}
                  className="self-end font-body text-xs text-ink-soft px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  {t("later")}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
