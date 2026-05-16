"use client";

/**
 * InfoTip — a small ⓘ button that shows a popover tooltip when tapped.
 * Dismisses by tapping anywhere outside, or by tapping the ⓘ again.
 *
 * Usage:
 *   <InfoTip text="Rest days let Heo skip a day without breaking her streak." />
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  text: string;
  /** Where to anchor the popover. Defaults to "top". */
  position?: "top" | "bottom";
  /** Optional extra class on the wrapper */
  className?: string;
}

export function InfoTip({ text, position = "top", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Thông tin"
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold select-none active:scale-90 transition-transform"
        style={{
          backgroundColor: open ? "rgba(196,168,220,0.4)" : "rgba(196,168,220,0.2)",
          color: "#8B5CF6",
          border: "1px solid rgba(196,168,220,0.5)",
        }}
      >
        i
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position === "top" ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-56 rounded-xl px-3 py-2.5 shadow-lg"
            style={{
              backgroundColor: "rgba(255,249,245,0.98)",
              border: "1px solid rgba(196,168,220,0.4)",
              boxShadow: "0 8px 24px rgba(58,33,41,0.12)",
              ...(position === "top"
                ? { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
                : { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }),
            }}
          >
            <p className="text-xs text-ink leading-relaxed">{text}</p>
            {/* Arrow */}
            <div
              className="absolute w-2 h-2 rotate-45"
              style={{
                backgroundColor: "rgba(255,249,245,0.98)",
                border: "1px solid rgba(196,168,220,0.4)",
                ...(position === "top"
                  ? { bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", borderTop: "none", borderLeft: "none" }
                  : { top: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", borderBottom: "none", borderRight: "none" }),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
