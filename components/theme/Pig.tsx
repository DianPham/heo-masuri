"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type PigPose =
  | "neutral" | "sleepy" | "heart-eyes" | "sad" | "sparkle"
  | "studying" | "cheering" | "thinking";

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
        }, 200);
      }, delay);
    }

    scheduleBlink();
    return () => {
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, [animate]);

  return (
    // Float idle: 6 px up + subtle scale swell, 2.8 s loop
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={
        animate
          ? { y: [0, -6, 0], scale: [1, 1.04, 1] }
          : undefined
      }
      transition={
        animate
          ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      {/* ── Behind-head elements (arms for certain poses) ── */}
      <PigArms pose={pose} />

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

// ── Behind-head arms (rendered before head circle) ──────────
function PigArms({ pose }: { pose: PigPose }) {
  switch (pose) {
    case "cheering":
      return (
        <>
          {/* Left arm raised (thick stroke = arm body) */}
          <path d="M16 63 C8 52 5 40 7 28" stroke={BODY}   strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M16 63 C8 52 5 40 7 28" stroke={STROKE} strokeWidth={SW}  strokeLinecap="round" fill="none" />
          {/* Right arm raised */}
          <path d="M64 63 C72 52 75 40 73 28" stroke={BODY}   strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M64 63 C72 52 75 40 73 28" stroke={STROKE} strokeWidth={SW}  strokeLinecap="round" fill="none" />
        </>
      );
    case "thinking":
      return (
        <>
          {/* Right arm bent upward, hand near chin */}
          <path d="M65 62 C74 56 74 48 62 50" stroke={BODY}   strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M65 62 C74 56 74 48 62 50" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" fill="none" />
        </>
      );
    default:
      return null;
  }
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

    // ── Notebook poses ───────────────────────────────────────

    case "studying":
      return (
        <>
          {/* Normal eyes */}
          <circle cx="29" cy="41" r="4.5" fill={STROKE} />
          <circle cx="51" cy="41" r="4.5" fill={STROKE} />
          <circle cx="31" cy="39" r="1.8" fill={WHITE} />
          <circle cx="53" cy="39" r="1.8" fill={WHITE} />
          {/* Round glasses frames */}
          <circle cx="29" cy="41" r="7" fill="none" stroke={STROKE} strokeWidth="1.3" />
          <circle cx="51" cy="41" r="7" fill="none" stroke={STROKE} strokeWidth="1.3" />
          {/* Bridge */}
          <path d="M36 41 L44 41" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" />
          {/* Earpieces */}
          <path d="M22 39.5 L16 37" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M58 39.5 L64 37" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
          {/* Open book (held up in front, rendered on top of snout) */}
          <rect x="21" y="62" width="38" height="14" rx="2" fill={GOLD} stroke={STROKE} strokeWidth="1.2" />
          <line x1="40" y1="62" x2="40" y2="76" stroke={STROKE} strokeWidth="0.9" />
          {/* Page lines — left */}
          <line x1="23" y1="66" x2="38" y2="66" stroke={STROKE} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
          <line x1="23" y1="69.5" x2="38" y2="69.5" stroke={STROKE} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
          <line x1="23" y1="73" x2="38" y2="73" stroke={STROKE} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
          {/* Page lines — right */}
          <line x1="42" y1="66" x2="57" y2="66" stroke={STROKE} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
          <line x1="42" y1="69.5" x2="57" y2="69.5" stroke={STROKE} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
          <line x1="42" y1="73" x2="57" y2="73" stroke={STROKE} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
        </>
      );

    case "cheering":
      return (
        <>
          {/* Happy squinting crescents */}
          <path d="M24 43 Q29 38 34 43" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M46 43 Q51 38 56 43" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Brighter flushed cheeks */}
          <ellipse cx="20" cy="51" rx="9.5" ry="6.5" fill={CHEEK} opacity="0.65" />
          <ellipse cx="60" cy="51" rx="9.5" ry="6.5" fill={CHEEK} opacity="0.65" />
          {/* Sparkles at all four corners */}
          <FourPointStar cx={8}  cy={14} r={4.5} />
          <FourPointStar cx={72} cy={12} r={3.8} />
          <FourPointStar cx={75} cy={32} r={2.8} />
          <FourPointStar cx={5}  cy={32} r={2.8} />
        </>
      );

    case "thinking":
      return (
        <>
          {/* Normal eyes */}
          <circle cx="29" cy="41" r="4.5" fill={STROKE} />
          <circle cx="51" cy="41" r="4.5" fill={STROKE} />
          <circle cx="31" cy="39" r="1.8" fill={WHITE} />
          <circle cx="53" cy="39" r="1.8" fill={WHITE} />
          {/* Left brow raised (curious) */}
          <path d="M22 33.5 Q29 29 35 32" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Right brow more neutral */}
          <path d="M45 33 Q51 31 57 33.5" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Thought bubble (upper right, above right ear) */}
          <circle cx="66" cy="13" r="8.5" fill={WHITE} stroke={STROKE} strokeWidth="0.9" />
          <text x="63" y="18" fontSize="11" fill={STROKE} fontFamily="Georgia,serif" fontWeight="bold">?</text>
          {/* Trailing dots leading to thought bubble */}
          <circle cx="59" cy="23" r="2.2" fill={WHITE} stroke={STROKE} strokeWidth="0.8" />
          <circle cx="62" cy="18" r="1.5" fill={WHITE} stroke={STROKE} strokeWidth="0.7" />
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
function PigHeart({ cx, cy, size = 10 }: { cx: number; cy: number; size?: number }) {
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
  const ri = r * 0.38;
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
