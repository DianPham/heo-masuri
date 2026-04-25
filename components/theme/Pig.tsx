"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type PigPose = "neutral" | "sleepy" | "heart-eyes" | "sad" | "sparkle";

interface PigProps {
  pose?: PigPose;
  size?: number;
  className?: string;
  /** Set false to freeze (no breathing, no blink) — use for icons and static art */
  animate?: boolean;
}

// ── Palette (matches CSS token values) ──────────────────────
const BODY   = "#FFC9D5"; // --rose-200
const SNOUT  = "#E97A95"; // --rose-400
const CHEEK  = "#F8A8BC"; // --rose-300
const STROKE = "#3A2129"; // --ink
const WHITE  = "#FFFFFF";
const GOLD   = "#E8B86D"; // --gold
const TEAR   = "#A8C4E0"; // soft blue

const SW = 1.5; // global stroke-width

export function Pig({
  pose = "neutral",
  size = 80,
  className = "",
  animate = true,
}: PigProps) {
  // Blink state — closed eyes render for 140 ms every 4–6 s
  const [blinking, setBlinking] = useState(false);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animate) return;

    function scheduleBlink() {
      const delay = 4000 + Math.random() * 2500;
      blinkTimer.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    }

    scheduleBlink();
    return () => {
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, [animate]);

  return (
    // Gentle float idle: 2 px up and back, 3.6 s loop
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={animate ? { y: [0, -2, 0] } : undefined}
      transition={
        animate
          ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      {/* ── Ears (rendered before head so head overlaps the base) ── */}
      <EarPair />

      {/* ── Head ── */}
      <circle
        cx="40" cy="47" r="28"
        fill={BODY} stroke={STROKE} strokeWidth={SW}
      />

      {/* ── Cheeks ── */}
      <ellipse cx="21" cy="53" rx="8"   ry="5.5" fill={CHEEK} opacity="0.55" />
      <ellipse cx="59" cy="53" rx="8"   ry="5.5" fill={CHEEK} opacity="0.55" />

      {/* ── Snout ── */}
      <ellipse
        cx="40" cy="58" rx="13" ry="9"
        fill={SNOUT} stroke={STROKE} strokeWidth={SW}
      />
      {/* Nostrils */}
      <ellipse cx="35"   cy="59" rx="2.5" ry="3"   fill={STROKE} />
      <ellipse cx="45"   cy="59" rx="2.5" ry="3"   fill={STROKE} />

      {/* ── Eyes + pose-specific overlays ── */}
      <PigFace pose={pose} blinking={blinking} />
    </motion.svg>
  );
}

// ── Ear pair ────────────────────────────────────────────────
function EarPair() {
  return (
    <>
      {/* Left ear */}
      <ellipse
        cx="17" cy="23" rx="8.5" ry="11.5"
        fill={BODY} stroke={STROKE} strokeWidth={SW}
      />
      <ellipse cx="17" cy="23" rx="4.5" ry="7" fill={SNOUT} />

      {/* Right ear */}
      <ellipse
        cx="63" cy="23" rx="8.5" ry="11.5"
        fill={BODY} stroke={STROKE} strokeWidth={SW}
      />
      <ellipse cx="63" cy="23" rx="4.5" ry="7" fill={SNOUT} />
    </>
  );
}

// ── Face content (eyes + pose overlays) ─────────────────────
function PigFace({ pose, blinking }: { pose: PigPose; blinking: boolean }) {
  switch (pose) {

    case "sleepy":
      return (
        <>
          {/* Droopy half-closed eyes */}
          <path d="M25 42 Q29 39 33 42" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M47 42 Q51 39 55 42" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* ZZZ bubbles */}
          <text x="57" y="21" fontSize="9"   fill={STROKE} opacity="0.45" fontFamily="Georgia,serif" fontStyle="italic">z</text>
          <text x="63" y="14" fontSize="7"   fill={STROKE} opacity="0.30" fontFamily="Georgia,serif" fontStyle="italic">z</text>
          <text x="68" y="9"  fontSize="5.5" fill={STROKE} opacity="0.20" fontFamily="Georgia,serif" fontStyle="italic">z</text>
        </>
      );

    case "heart-eyes":
      return (
        <>
          <PigHeart cx={29} cy={41} size={10} />
          <PigHeart cx={51} cy={41} size={10} />
        </>
      );

    case "sad":
      return (
        <>
          {/* Worried brows — inner corner raised */}
          <path d="M23 34 Q27 31.5 32 33" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M48 33 Q53 31.5 57 34" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Droopy eyes — corners turned down */}
          <path d="M25 41 Q29 44 33 41" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M47 41 Q51 44 55 41" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* Single teardrop under left eye */}
          <path d="M28 46 Q30 50 28 53 Q26 50 28 46Z" fill={TEAR} opacity="0.8" />
        </>
      );

    case "sparkle":
      return (
        <>
          {/* Bright dot eyes */}
          <circle cx="29" cy="41" r="4.5" fill={STROKE} />
          <circle cx="51" cy="41" r="4.5" fill={STROKE} />
          <circle cx="31"   cy="39" r="1.8" fill={WHITE} />
          <circle cx="53"   cy="39" r="1.8" fill={WHITE} />
          {/* 4-point star sparkles at corners */}
          <FourPointStar cx={8}  cy={16} r={4.5} />
          <FourPointStar cx={72} cy={13} r={3.5} />
          <FourPointStar cx={74} cy={54} r={3.5} />
          <FourPointStar cx={6}  cy={60} r={3}   />
        </>
      );

    default: // "neutral" — can blink
      return blinking ? (
        <>
          <path d="M25 41 Q29 38 33 41" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M47 41 Q51 38 55 41" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="29" cy="41" r="4.5" fill={STROKE} />
          <circle cx="51" cy="41" r="4.5" fill={STROKE} />
          {/* Shine dots */}
          <circle cx="31"   cy="39" r="1.8" fill={WHITE} />
          <circle cx="53"   cy="39" r="1.8" fill={WHITE} />
        </>
      );
  }
}

// ── Heart eye (for heart-eyes pose) ─────────────────────────
// A clean heart path scaled and positioned by cx/cy/size.
function PigHeart({ cx, cy, size = 10 }: { cx: number; cy: number; size?: number }) {
  // Heart path drawn in a 10×9 box, top-left at origin.
  // We translate so the visual centre lands on (cx, cy).
  const s = size / 10;
  const tx = cx - size * 0.5;
  const ty = cy - size * 0.52;
  return (
    <path
      transform={`translate(${tx},${ty}) scale(${s})`}
      d="M5 8.8 C5 8.8 0 5.2 0 2.6 C0 1.2 1.1 0 2.5 0 C3.3 0 4.0 0.45 4.5 1.05 C5.0 0.45 5.7 0 6.5 0 C7.9 0 9 1.2 9 2.6 C9 5.2 5 8.8 5 8.8 Z"
      fill="#D14D6F"
    />
  );
}

// ── 4-point star sparkle ─────────────────────────────────────
function FourPointStar({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const ri = r * 0.38; // inner radius
  // 4 points at 0°, 90°, 180°, 270° with narrow inner points between them
  const pts = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    const dist = i % 2 === 0 ? r : ri;
    return `${cx + dist * Math.sin(rad)},${cy - dist * Math.cos(rad)}`;
  });
  return (
    <polygon
      points={pts.join(" ")}
      fill={GOLD}
      opacity="0.92"
    />
  );
}
