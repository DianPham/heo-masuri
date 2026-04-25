"use client";

import { motion } from "motion/react";

interface HeartProps {
  size?: number;
  color?: string;
  className?: string;
  filled?: boolean;
  animate?: boolean;
}

export function Heart({
  size = 24,
  color = "#D14D6F",
  className = "",
  filled = true,
  animate = false,
}: HeartProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={animate ? { scale: [1, 1.2, 1] } : undefined}
      transition={animate ? { duration: 0.5, ease: "easeInOut" } : undefined}
    >
      <path
        d="M12 21.593C12 21.593 2 14.5 2 7.5C2 4.462 4.462 2 7.5 2C9.36 2 11 3.073 12 4.5C13 3.073 14.64 2 16.5 2C19.538 2 22 4.462 22 7.5C22 14.5 12 21.593 12 21.593Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// Floating heart particle used in button animations
export function FloatingHeart({
  color = "#D14D6F",
  size = 16,
  style,
}: {
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      style={{ position: "absolute", pointerEvents: "none", ...style }}
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <Heart size={size} color={color} filled />
    </motion.div>
  );
}
