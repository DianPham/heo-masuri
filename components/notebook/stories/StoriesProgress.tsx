"use client";

/**
 * StoriesProgress — top progress dots.
 * Filled = visited, half-filled (pulsing) = current, empty = upcoming.
 * Tapping a visited dot jumps to that card.
 * Blueprint §7: "Tappable to jump (only to visited cards — can't skip ahead)."
 */
import { motion } from "motion/react";

interface StoriesProgressProps {
  total: number;
  current: number;
  visited: Set<number>;
  onJump: (index: number) => void;
}

export function StoriesProgress({
  total,
  current,
  visited,
  onJump,
}: StoriesProgressProps) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 px-6"
      data-no-nav="true"
    >
      {Array.from({ length: total }, (_, i) => {
        const isVisited = visited.has(i);
        const isCurrent = i === current;

        return (
          <button
            key={i}
            type="button"
            data-no-nav="true"
            onClick={() => {
              if (isVisited || isCurrent) onJump(i);
            }}
            aria-label={`Card ${i + 1}`}
            className="flex items-center justify-center p-1 -m-1"
            style={{ cursor: isVisited || isCurrent ? "pointer" : "default" }}
          >
            {isCurrent ? (
              // Current card: filled + soft pulse ring
              <motion.span
                className="block rounded-full bg-rose-400"
                style={{ width: 8, height: 8 }}
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : isVisited ? (
              // Visited: solid rose
              <span
                className="block rounded-full bg-rose-400"
                style={{ width: 6, height: 6 }}
              />
            ) : (
              // Upcoming: empty ring
              <span
                className="block rounded-full border border-rose-300/60"
                style={{ width: 6, height: 6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
