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
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;

    setState(isIOS && !isStandalone ? "install-banner" : "pre-prompt");
  }, []);

  useEffect(() => {
    window.addEventListener("push-eligible", tryShow);
    // Also surface the prompt on app load if the user hasn't decided yet.
    // Previously the prompt ONLY fired on a "missing" tap or an incoming
    // thinking ping (signalPushEligible) — so a partner who never hit those
    // (e.g. Masuri) was never asked and never subscribed, silently breaking
    // push for that direction. A short delay avoids prompting before the SW
    // is ready and before the first paint settles.
    const id = setTimeout(tryShow, 3500);

    // Self-heal: if permission is ALREADY granted, make sure a live push
    // subscription actually exists and is registered server-side. A granted
    // permission does NOT guarantee a valid subscription — the device may have
    // dropped it, the PWA may have been reinstalled, the keys may have rotated,
    // or the original POST may have failed. Without this, such a user is never
    // re-prompted (permission != "default") and silently never receives push.
    ensureSubscribed();

    return () => {
      window.removeEventListener("push-eligible", tryShow);
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryShow]);

  /** Subscribe (or reuse an existing subscription) and upsert it server-side. */
  async function subscribeAndSave(): Promise<boolean> {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!pubKey) return false;
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
    });
    return res.ok;
  }

  async function ensureSubscribed() {
    try {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      await subscribeAndSave();
    } catch {
      /* best-effort */
    }
  }

  async function handleEnable() {
    setState("hidden");
    if (typeof Notification === "undefined") return;

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    try {
      await subscribeAndSave();
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
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-28 left-4 right-4 z-50"
        >
          <div
            className="rounded-3xl p-6 flex flex-col gap-5 max-w-sm mx-auto"
            style={{
              background: "rgba(255, 249, 245, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "2px solid rgba(248,168,188,0.35)",
              boxShadow: "0 12px 40px -8px rgba(168,50,79,0.28), 0 2px 8px rgba(168,50,79,0.08)",
            }}
          >
            {state === "pre-prompt" ? (
              <>
                <div className="flex flex-col gap-2">
                  <p className="font-accent text-lg font-semibold text-ink leading-snug">
                    🔔 {t("prePromptTitle")}
                  </p>
                  <p className="font-accent text-base text-ink-soft leading-relaxed">
                    {t("prePromptBody")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 font-accent text-base text-ink-soft py-3 rounded-2xl
                               border-2 border-rose-200/60 hover:bg-rose-100/60 transition-colors"
                  >
                    {t("later")}
                  </button>
                  <button
                    onClick={handleEnable}
                    className="flex-1 font-accent text-base font-semibold text-white py-3 rounded-2xl
                               bg-rose-400 hover:bg-rose-500 active:scale-[0.97] transition-all"
                  >
                    {t("enable")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <p className="font-accent text-lg font-semibold text-ink leading-snug">
                    📲 {t("installBanner")}
                  </p>
                  <p className="font-accent text-base text-ink-soft leading-relaxed">
                    1. {t("installStep1")}
                  </p>
                  <p className="font-accent text-base text-ink-soft leading-relaxed">
                    2. {t("installStep2")}
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="w-full font-accent text-base text-ink-soft py-3 rounded-2xl
                             border-2 border-rose-200/60 hover:bg-rose-100/60 transition-colors"
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
