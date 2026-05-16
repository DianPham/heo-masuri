"use client";

export type StickerType =
  | "heart_filled" | "heart_outline"
  | "star_filled"  | "star_outline"
  | "sparkle"
  | "bow_pink"     | "bow_butter"
  | "flower_rose"  | "flower_daisy"
  | "cloud"        | "sun"          | "moon"
  | "coffee_cup"   | "book"         | "pencil"
  | "letter"       | "pig_mini";

interface StickerProps {
  type: StickerType;
  size?: number;
  className?: string;
}

// Palette — matches CSS tokens
const ROSE_400  = "#E97A95";
const ROSE_500  = "#D14D6F";
const ROSE_200  = "#FFC9D5";
const INK       = "#3A2129";
const GOLD      = "#E8B86D";
const BUTTER    = "#FAE8B8";
const CREAM     = "#FFF9F5";
const WHITE     = "#FFFFFF";
const BROWN     = "#8B5E3C";

export function Sticker({ type, size = 32, className = "" }: StickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <StickerShape type={type} />
    </svg>
  );
}

function StickerShape({ type }: { type: StickerType }) {
  switch (type) {

    case "heart_filled":
      return (
        <path
          d="M16 27 C16 27 4 18.5 4 11 C4 7.5 6.7 4.5 10.5 4.5 C12.8 4.5 14.7 5.8 16 7.5
             C17.3 5.8 19.2 4.5 21.5 4.5 C25.3 4.5 28 7.5 28 11 C28 18.5 16 27 16 27Z"
          fill={ROSE_500}
          stroke={INK}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      );

    case "heart_outline":
      return (
        <path
          d="M16 27 C16 27 4 18.5 4 11 C4 7.5 6.7 4.5 10.5 4.5 C12.8 4.5 14.7 5.8 16 7.5
             C17.3 5.8 19.2 4.5 21.5 4.5 C25.3 4.5 28 7.5 28 11 C28 18.5 16 27 16 27Z"
          fill="none"
          stroke={ROSE_500}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );

    case "star_filled":
      return <StarShape filled />;

    case "star_outline":
      return <StarShape filled={false} />;

    case "sparkle":
      return (
        <>
          <SparklePoints cx={16} cy={16} r={9}  color={GOLD} />
          <SparklePoints cx={7}  cy={7}  r={4}  color={ROSE_400} />
          <SparklePoints cx={26} cy={8}  r={3.5}color={GOLD} />
          <SparklePoints cx={25} cy={25} r={3}  color={ROSE_400} />
          <SparklePoints cx={6}  cy={24} r={2.5}color={GOLD} />
        </>
      );

    case "bow_pink":
      return <BowShape color={ROSE_400} center={ROSE_200} knot={ROSE_500} />;

    case "bow_butter":
      return <BowShape color={BUTTER} center={CREAM} knot={GOLD} />;

    case "flower_rose":
      return <FlowerShape petalColor={ROSE_400} centerColor={GOLD} petalCount={6} />;

    case "flower_daisy":
      return <FlowerShape petalColor={WHITE} centerColor={GOLD} petalCount={8} stroke={ROSE_200} />;

    case "cloud":
      return (
        <>
          <path
            d="M6 22 Q4 22 4 19 Q4 16 7 15.5 Q7 12 10 11.5 Q10 8 14 8 Q17 8 18.5 10.5
               Q20 9.5 22 10 Q25 10.5 25 13.5 Q28 14 28 17 Q28 20 25 20 Z"
            fill={WHITE}
            stroke={INK}
            strokeWidth="1.1"
          />
          <ellipse cx="16" cy="25" rx="9" ry="4" fill={ROSE_200} opacity="0.5" />
        </>
      );

    case "sun":
      return (
        <>
          {/* Rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 16 + 10 * Math.sin(rad), y1 = 16 - 10 * Math.cos(rad);
            const x2 = 16 + 13 * Math.sin(rad), y2 = 16 - 13 * Math.cos(rad);
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />;
          })}
          <circle cx="16" cy="16" r="7.5" fill={GOLD} stroke={INK} strokeWidth="1.1" />
          <circle cx="14" cy="14" r="2" fill={WHITE} opacity="0.5" />
        </>
      );

    case "moon":
      return (
        <>
          <path
            d="M22 10 Q18 8 13 11 Q8 14 8 20 Q8 26 14 28 Q20 30 24 25 Q18 25 15 21 Q12 17 14 13 Q16 9 22 10Z"
            fill={GOLD}
            stroke={INK}
            strokeWidth="1.1"
          />
          <circle cx="20" cy="14" r="1.5" fill={WHITE} opacity="0.6" />
          <circle cx="24" cy="19" r="1"   fill={WHITE} opacity="0.4" />
        </>
      );

    case "coffee_cup":
      return (
        <>
          {/* Cup body */}
          <path
            d="M7 12 L9 26 Q9 28 11 28 L21 28 Q23 28 23 26 L25 12 Z"
            fill={BROWN}
            stroke={INK}
            strokeWidth="1.1"
          />
          {/* Handle */}
          <path
            d="M23 16 Q29 16 29 20 Q29 24 23 24"
            fill="none"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Coffee surface */}
          <ellipse cx="16" cy="12" rx="9" ry="3" fill="#6B3A2A" stroke={INK} strokeWidth="1" />
          {/* Steam */}
          <path d="M12 8 Q13 5 12 3" stroke={INK} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M16 7 Q17 4 16 2" stroke={INK} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M20 8 Q21 5 20 3" stroke={INK} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      );

    case "book":
      return (
        <>
          {/* Back cover */}
          <rect x="5" y="6" width="20" height="22" rx="2" fill={ROSE_400} stroke={INK} strokeWidth="1.1" />
          {/* Pages */}
          <rect x="7" y="8" width="16" height="20" rx="1" fill={CREAM} stroke={INK} strokeWidth="0.8" />
          {/* Spine line */}
          <line x1="9" y1="8" x2="9" y2="28" stroke={INK} strokeWidth="0.8" />
          {/* Page lines */}
          <line x1="12" y1="13" x2="21" y2="13" stroke={INK} strokeWidth="0.6" opacity="0.5" />
          <line x1="12" y1="16" x2="21" y2="16" stroke={INK} strokeWidth="0.6" opacity="0.5" />
          <line x1="12" y1="19" x2="21" y2="19" stroke={INK} strokeWidth="0.6" opacity="0.5" />
          <line x1="12" y1="22" x2="18" y2="22" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        </>
      );

    case "pencil":
      return (
        <g transform="rotate(-30, 16, 16)">
          {/* Body */}
          <rect x="12" y="4" width="8" height="20" rx="1" fill={GOLD} stroke={INK} strokeWidth="1" />
          {/* Eraser */}
          <rect x="12" y="4" width="8" height="4" rx="1" fill={ROSE_200} stroke={INK} strokeWidth="1" />
          {/* Ferrule */}
          <rect x="12" y="22" width="8" height="2" fill={INK} opacity="0.3" />
          {/* Tip */}
          <path d="M12 24 L16 30 L20 24Z" fill={CREAM} stroke={INK} strokeWidth="0.9" />
          {/* Lead */}
          <circle cx="16" cy="29" r="1" fill={INK} />
          {/* Stripe */}
          <line x1="12" y1="14" x2="20" y2="14" stroke={INK} strokeWidth="0.6" opacity="0.3" />
        </g>
      );

    case "letter":
      return (
        <>
          {/* Envelope body */}
          <rect x="3" y="8" width="26" height="18" rx="2" fill={CREAM} stroke={INK} strokeWidth="1.1" />
          {/* Flap */}
          <path d="M3 8 L16 18 L29 8" fill="none" stroke={INK} strokeWidth="1.1" />
          {/* Bottom fold lines */}
          <path d="M3 26 L11 18" stroke={INK} strokeWidth="0.8" opacity="0.4" />
          <path d="M29 26 L21 18" stroke={INK} strokeWidth="0.8" opacity="0.4" />
          {/* Wax seal */}
          <circle cx="16" cy="20" r="4" fill={ROSE_400} stroke={INK} strokeWidth="0.8" />
          <text x="14" y="23" fontSize="6" fill={WHITE} fontFamily="Georgia,serif">♥</text>
        </>
      );

    case "pig_mini": {
      // Tiny pig face, centered in 32x32 viewBox
      const B = "#FFC9D5", SN = "#E97A95", CH = "#F8A8BC", ST = "#3A2129", WH = "#FFFFFF";
      return (
        <>
          {/* Ears */}
          <ellipse cx="9"  cy="10" rx="4.5" ry="6" fill={B} stroke={ST} strokeWidth="0.9" />
          <ellipse cx="9"  cy="10" rx="2.3" ry="3.5" fill={SN} />
          <ellipse cx="23" cy="10" rx="4.5" ry="6" fill={B} stroke={ST} strokeWidth="0.9" />
          <ellipse cx="23" cy="10" rx="2.3" ry="3.5" fill={SN} />
          {/* Head */}
          <circle cx="16" cy="18" r="12" fill={B} stroke={ST} strokeWidth="0.9" />
          {/* Cheeks */}
          <ellipse cx="9"  cy="21" rx="3.5" ry="2.5" fill={CH} opacity="0.55" />
          <ellipse cx="23" cy="21" rx="3.5" ry="2.5" fill={CH} opacity="0.55" />
          {/* Snout */}
          <ellipse cx="16" cy="24" rx="5.5" ry="3.8" fill={SN} stroke={ST} strokeWidth="0.9" />
          <ellipse cx="14" cy="24.5" rx="1" ry="1.2" fill={ST} />
          <ellipse cx="18" cy="24.5" rx="1" ry="1.2" fill={ST} />
          {/* Eyes */}
          <circle cx="12" cy="17" r="2" fill={ST} />
          <circle cx="20" cy="17" r="2" fill={ST} />
          <circle cx="12.7" cy="16.3" r="0.8" fill={WH} />
          <circle cx="20.7" cy="16.3" r="0.8" fill={WH} />
        </>
      );
    }

    default:
      return null;
  }
}

// ── Star ─────────────────────────────────────────────────────
function StarShape({ filled }: { filled: boolean }) {
  // interleave outer + inner points for proper 5-point star
  const allPts: string[] = [];
  [0, 72, 144, 216, 288].forEach((deg) => {
    const rOuter = 12, rInner = 5;
    const outer = (deg * Math.PI) / 180;
    const inner = ((deg + 36) * Math.PI) / 180;
    allPts.push(`${16 + rOuter * Math.sin(outer)},${16 - rOuter * Math.cos(outer)}`);
    allPts.push(`${16 + rInner * Math.sin(inner)},${16 - rInner * Math.cos(inner)}`);
  });
  return (
    <polygon
      points={allPts.join(" ")}
      fill={filled ? GOLD : "none"}
      stroke={filled ? INK : GOLD}
      strokeWidth={filled ? "1.1" : "1.6"}
      strokeLinejoin="round"
    />
  );
}

// ── Bow ──────────────────────────────────────────────────────
function BowShape({ color, knot }: { color: string; center?: string; knot: string }) {
  return (
    <>
      {/* Left wing */}
      <path
        d="M4 10 Q8 8 12 14 Q10 18 4 20 Q2 15 4 10Z"
        fill={color}
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Right wing */}
      <path
        d="M28 10 Q24 8 20 14 Q22 18 28 20 Q30 15 28 10Z"
        fill={color}
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Tail left */}
      <path
        d="M12 16 Q8 20 6 26"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M12 16 Q8 20 6 26"
        fill="none"
        stroke={INK}
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Tail right */}
      <path
        d="M20 16 Q24 20 26 26"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 16 Q24 20 26 26"
        fill="none"
        stroke={INK}
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Knot */}
      <ellipse cx="16" cy="15" rx="4" ry="3.5" fill={knot} stroke={INK} strokeWidth="1" />
    </>
  );
}

// ── Flower ───────────────────────────────────────────────────
function FlowerShape({
  petalColor,
  centerColor,
  petalCount,
  stroke,
}: {
  petalColor: string;
  centerColor: string;
  petalCount: number;
  stroke?: string;
}) {
  const petals = Array.from({ length: petalCount }, (_, i) => {
    const deg = (i * 360) / petalCount;
    const rad = (deg * Math.PI) / 180;
    const cx = 16 + 7 * Math.sin(rad);
    const cy = 16 - 7 * Math.cos(rad);
    return <ellipse key={i} cx={cx} cy={cy} rx="4" ry="5.5" fill={petalColor} stroke={stroke ?? INK} strokeWidth="0.9" transform={`rotate(${deg}, ${cx}, ${cy})`} />;
  });
  return (
    <>
      {petals}
      <circle cx="16" cy="16" r="5.5" fill={centerColor} stroke={INK} strokeWidth="0.9" />
      <circle cx="14.5" cy="14.5" r="1.5" fill={WHITE} opacity="0.5" />
    </>
  );
}

// ── 4-point sparkle ──────────────────────────────────────────
function SparklePoints({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const ri = r * 0.3;
  const pts = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    const dist = i % 2 === 0 ? r : ri;
    return `${cx + dist * Math.sin(rad)},${cy - dist * Math.cos(rad)}`;
  });
  return <polygon points={pts.join(" ")} fill={color} opacity="0.9" />;
}
