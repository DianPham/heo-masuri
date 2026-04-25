"use client";

import { motion } from "motion/react";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:   "bg-rose-400 text-white hover:bg-rose-500 active:bg-rose-500",
  secondary: "bg-rose-100 text-ink hover:bg-rose-200 active:bg-rose-200",
  ghost:     "bg-transparent text-ink-soft hover:bg-rose-100 active:bg-rose-100",
  danger:    "bg-rose-600 text-white hover:bg-rose-600/90",
};

const sizeStyles: Record<string, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className = "", children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={[
          "relative inline-flex items-center justify-center gap-2 rounded-full font-body font-semibold",
          "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
          "disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
        disabled={disabled || loading}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        )}
        <span className={loading ? "opacity-0" : ""}>{children}</span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";
