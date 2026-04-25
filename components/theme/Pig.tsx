"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef } from "react";

export type PigPose = "neutral" | "sleepy" | "heart-eyes" | "sad" | "sparkle";

interface PigProps {
  pose?: PigPose;
  size?: number;
  className?: string;
  animate?: boolean;
}

// Shared palette
const BODY   = "#FFC9D5"; // --rose-200
const SNOUT  = "#E97A95"; // --rose-400
const CHEEK  = "#F8A8BC"; // --rose-300
const STROKE = "#3A2129"; // --ink
const WHITE  = "#FFFFFF";

export function Pig({ pose = "neutral", size = 80, className = "", animate = true }: PigProps) {
  const controls = useAnimationControls();
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle breathing + blink cycle
  useEffect(() => {
    if (!animate) return;

    controls.start({
      scaleY: [1, 1.025, 1],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    });

    function scheduleBlink() {
      const delay = 4000 + Math.random() * 2000;
      blinkTimer.current = setTimeout(() => {
        controls.start({
          scaleY: [1, 0.1, 1],
          transition: { duration: 0.15, ease: "easeInOut" },
        });
        scheduleBlink();
      }, delay);
    }
    scheduleBlink();

    return () => {
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, [animate, controls]);

  const sw = 1.5; // stroke width

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={animate ? controls : undefined}
      style={{ transformOrigin: "bottom center" }}
    >
      {/* ── Body ── */}
      <ellipse cx="40" cy="46" rx="28" ry="26" fill={BODY} stroke={STROKE} strokeWidth={sw} />

      {/* ── Cheeks ── */}
      <ellipse cx="20" cy="50" rx="7" ry="5" fill={CHEEK} opacity="0.6" />
      <ellipse cx="60" cy="50" rx="7" ry="5" fill={CHEEK} opacity="0.6" />

      {/* ── Snout ── */}
      <ellipse cx="40" cy="56" rx="10" ry="7" fill={SNOUT} stroke={STROKE} strokeWidth={sw} />
      {/* Nostrils */}
      <ellipse cx="36.5" cy="57" rx="2" ry="2.5" fill={STROKE} />
      <ellipse cx="43.5" cy="57" rx="2" ry="2.5" fill={STROKE} />

      {/* ── Ears ── */}
      <ellipse cx="18" cy="24" rx="8" ry="10" fill={BODY} stroke={STROKE} strokeWidth={sw} />
      <ellipse cx="18" cy="24" rx="4.5" ry="6" fill={SNOUT} />
      <ellipse cx="62" cy="24" rx="8" ry="10" fill={BODY} stroke={STROKE} strokeWidth={sw} />
      <ellipse cx="62" cy="24" rx="4.5" ry="6" fill={SNOUT} />

      {/* ── Head ── */}
      <ellipse cx="40" cy="38" rx="22" ry="20" fill={BODY} stroke={STROKE} strokeWidth={sw} />

      {/* ── Eyes — vary by pose ── */}
      <PigEyes pose={pose} />

      {/* ── Pose-specific overlays ── */}
      {pose === "sleepy" && <SleepyOverlay />}
      {pose === "sparkle" && <SparkleOverlay />}
      {pose === "sad" && <SadOverlay />}
    </motion.svg>
  );
}

function PigEyes({ pose }: { pose: PigPose }) {
  if (pose === "heart-eyes") {
    return (
      <>
        {/* Left heart eye */}
        <HeartEye cx={31} cy={36} />
        {/* Right heart eye */}
        <HeartEye cx={49} cy={36} />
      </>
    );
  }
  if (pose === "sleepy") {
    return (
      <>
        {/* Droopy closed eyes */}
        <path d="M27 36 Q31 33 35 36" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M45 36 Q49 33 53 36" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (pose === "sad") {
    return (
      <>
        {/* Sad × eyes */}
        <line x1="28" y1="33" x2="34" y2="39" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <line x1="34" y1="33" x2="28" y2="39" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="33" x2="52" y2="39" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <line x1="52" y1="33" x2="46" y2="39" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  // neutral + sparkle: simple dot eyes
  return (
    <>
      <circle cx="31" cy="36" r="3.5" fill={STROKE} />
      <circle cx="49" cy="36" r="3.5" fill={STROKE} />
      {/* Shine */}
      <circle cx="32.5" cy="34.5" r="1.2" fill={WHITE} />
      <circle cx="50.5" cy="34.5" r="1.2" fill={WHITE} />
    </>
  );
}

function HeartEye({ cx, cy }: { cx: number; cy: number }) {
  // Small heart shape centered on cx,cy
  return (
    <g transform={`translate(${cx - 5}, ${cy - 5})`}>
      <path
        d="M5 8.5 C5 8.5 0 5 0 2.5 C0 1.1 1.1 0 2.5 0 C3.3 0 4 0.4 4.5 1 C5 0.4 5.7 0 6.5 0 C8 0 9 1.1 9 2.5 C9 5 5 8.5 5 8.5Z"
        fill="#D14D6F"
        stroke="none"
      />
    </g>
  );
}

function SleepyOverlay() {
  return (
    <>
      {/* Z Z Z bubbles */}
      <text x="58" y="22" fontSize="8" fill={STROKE} opacity="0.5" fontFamily="serif">z</text>
      <text x="64" y="16" fontSize="6" fill={STROKE} opacity="0.4" fontFamily="serif">z</text>
    </>
  );
}

function SparkleOverlay() {
  return (
    <>
      {/* 4-pointed star sparkles around the pig */}
      <Sparkle cx={12} cy={14} r={4} />
      <Sparkle cx={68} cy={18} r={3} />
      <Sparkle cx={72} cy={54} r={3.5} />
      <Sparkle cx={10} cy={60} r={3} />
    </>
  );
}

function Sparkle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <path
        d={`M0 ${-r} L${r * 0.3} ${-r * 0.3} L${r} 0 L${r * 0.3} ${r * 0.3} L0 ${r} L${-r * 0.3} ${r * 0.3} L${-r} 0 L${-r * 0.3} ${-r * 0.3}Z`}
        fill="#E8B86D"
        opacity="0.9"
      />
    </g>
  );
}

function SadOverlay() {
  return (
    <>
      {/* Tear drops */}
      <ellipse cx="29" cy="44" rx="1.5" ry="2.5" fill="#7289da" opacity="0.7" />
      <ellipse cx="51" cy="44" rx="1.5" ry="2.5" fill="#7289da" opacity="0.7" />
    </>
  );
}
