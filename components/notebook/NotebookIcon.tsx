"use client";

interface NotebookIconProps {
  size?: number;
  /** Fill color. Defaults to currentColor so it inherits from CSS. */
  color?: string;
  className?: string;
}

/**
 * Custom bottom-nav icon: a notebook with a tiny pig ear peeking over the top.
 * Uses currentColor by default so the nav can tint it active/inactive.
 */
export function NotebookIcon({ size = 24, color = "currentColor", className = "" }: NotebookIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Notebook spine */}
      <rect x="4" y="3" width="2.5" height="18" rx="1" fill={color} opacity="0.35" />

      {/* Notebook body */}
      <rect x="5.5" y="3" width="14.5" height="18" rx="2" fill={color} opacity="0.15" stroke={color} strokeWidth="1.4" />

      {/* Page lines */}
      <line x1="8.5" y1="9"  x2="18" y2="9"  stroke={color} strokeWidth="1"   strokeLinecap="round" opacity="0.5" />
      <line x1="8.5" y1="12" x2="18" y2="12" stroke={color} strokeWidth="1"   strokeLinecap="round" opacity="0.5" />
      <line x1="8.5" y1="15" x2="15" y2="15" stroke={color} strokeWidth="1"   strokeLinecap="round" opacity="0.5" />

      {/* Tiny pig ear peeking over top-right corner */}
      <ellipse cx="17.5" cy="2.8" rx="2.2" ry="2.8" fill={color} opacity="0.6" />
      <ellipse cx="17.5" cy="2.8" rx="1.1" ry="1.6" fill={color} opacity="0.25" />
    </svg>
  );
}
