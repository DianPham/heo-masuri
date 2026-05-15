"use client";

export type TapeColor = "pink" | "mint" | "butter" | "lilac";

interface TapeProps {
  color?: TapeColor;
  /** Width in px (tape strip's short axis). Default 28 */
  width?: number;
  /** Length in px (tape strip's long axis). Default 80 */
  length?: number;
  /** Rotation in degrees. Default 0 */
  rotate?: number;
  className?: string;
}

const TAPE_COLORS: Record<TapeColor, { fill: string; lines: string }> = {
  pink:   { fill: "#FFC9D5", lines: "#E97A95" },
  mint:   { fill: "#C5E0CB", lines: "#9CAF88" },
  butter: { fill: "#FAE8B8", lines: "#E8B86D" },
  lilac:  { fill: "#D7C9E8", lines: "#9B7FC0" },
};

export function Tape({
  color = "pink",
  width = 28,
  length = 80,
  rotate = 0,
  className = "",
}: TapeProps) {
  const { fill, lines } = TAPE_COLORS[color];

  // Generate diagonal texture lines across the tape rectangle
  const diagonalLines: React.ReactNode[] = [];
  const step = 8;
  // Lines go from top-right to bottom-left (–45°)
  for (let i = -length; i < length + width; i += step) {
    diagonalLines.push(
      <line
        key={i}
        x1={i}
        y1={0}
        x2={i - width}
        y2={width}
        stroke={lines}
        strokeWidth="0.6"
        opacity="0.3"
      />
    );
  }

  return (
    <svg
      width={length}
      height={width}
      viewBox={`0 0 ${length} ${width}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {/* Tape body with slightly torn/irregular edges */}
      <rect
        x="0"
        y="0"
        width={length}
        height={width}
        rx="2"
        fill={fill}
        opacity="0.82"
      />
      {/* Diagonal texture */}
      <clipPath id={`tape-clip-${color}-${length}-${width}`}>
        <rect x="0" y="0" width={length} height={width} rx="2" />
      </clipPath>
      <g clipPath={`url(#tape-clip-${color}-${length}-${width})`}>
        {diagonalLines}
      </g>
    </svg>
  );
}
