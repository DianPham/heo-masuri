"use client";

import { useState, useCallback, useRef } from "react";
import type { ToastData } from "./Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  const addToast = useCallback((
    message: string,
    type: ToastData["type"] = "default",
    duration = 4000
  ) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => dismissRef.current(id), duration);
    }
    return id;
  }, []);

  return { toasts, addToast, dismissToast: dismiss };
}
