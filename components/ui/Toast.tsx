"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export interface ToastData {
  id: string;
  message: string;
  type?: "default" | "success" | "error";
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const typeStyles = {
  default: "bg-rose-100 text-ink border-rose-200",
  success: "bg-sage/20 text-ink border-sage",
  error:   "bg-rose-200 text-rose-600 border-rose-400",
};

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={[
        "flex items-center gap-3 px-5 py-3 rounded-2xl border",
        "shadow-md text-sm font-body font-medium max-w-sm w-full",
        "backdrop-blur-sm",
        typeStyles[toast.type ?? "default"],
      ].join(" ")}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-0 right-0 flex flex-col items-center gap-2 z-50 px-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
