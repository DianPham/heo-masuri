/**
 * /dev/pig  — pig poses review page
 * For owner (Dân) review only. Not linked from anywhere in the app.
 * Shows all five poses at three sizes with their use-case labels.
 */
import { Pig } from "@/components/theme/Pig";
import type { PigPose } from "@/components/theme/Pig";

const POSES: { pose: PigPose; label: string; vi: string; usage: string }[] = [
  {
    pose: "neutral",
    label: "Neutral",
    vi: "Bình thường",
    usage: "App icon · Soft gate · Default state",
  },
  {
    pose: "sleepy",
    label: "Sleepy",
    vi: "Ngủ gật",
    usage: "Empty states · No recent activity",
  },
  {
    pose: "heart-eyes",
    label: "Heart-eyes",
    vi: "Tim tim",
    usage: "Received love ping · Ack confirmation",
  },
  {
    pose: "sad",
    label: "Sad",
    vi: "Buồn",
    usage: "Missing / Angry buzz entry · Error states",
  },
  {
    pose: "sparkle",
    label: "Sparkle",
    vi: "Tỏa sáng",
    usage: 'Countdown hits zero · "Heo ổn rồi" resolution',
  },
];

export default function PigReviewPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#FFF5F7",
        fontFamily: "system-ui, sans-serif",
        padding: "48px 32px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#3A2129",
              marginBottom: 6,
            }}
          >
            Pig SVG — Checkpoint 1 review 🐷
          </h1>
          <p style={{ color: "#6B4453", fontSize: 14 }}>
            Five poses used across the app. Animated versions on the left (idle
            float + blink), static on the right. Please review before
            proceeding.
          </p>
        </div>

        {/* Pose grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {POSES.map(({ pose, label, vi, usage }) => (
            <PoseCard
              key={pose}
              pose={pose}
              label={label}
              vi={vi}
              usage={usage}
            />
          ))}
        </div>

        {/* Size scale */}
        <div style={{ marginTop: 56 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#3A2129",
              marginBottom: 4,
            }}
          >
            Scale check — neutral pose at 40 / 80 / 120 px
          </h2>
          <p style={{ color: "#6B4453", fontSize: 13, marginBottom: 20 }}>
            Must look clean at all three sizes.
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 32 }}>
            {[40, 80, 120].map((s) => (
              <div key={s} style={{ textAlign: "center" }}>
                <Pig pose="neutral" size={s} animate={false} />
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6B4453",
                  }}
                >
                  {s}px
                </p>
              </div>
            ))}
          </div>
        </div>

        <p
          style={{
            marginTop: 48,
            fontSize: 12,
            color: "#A8324F",
            opacity: 0.6,
          }}
        >
          /dev/pig — review page, not linked in app navigation
        </p>
      </div>
    </div>
  );
}

function PoseCard({
  pose,
  label,
  vi,
  usage,
}: {
  pose: PigPose;
  label: string;
  vi: string;
  usage: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFE4EA",
        borderRadius: 20,
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Two sizes: animated + static */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Pig pose={pose} size={80} animate />
          <p style={{ fontSize: 10, color: "#6B4453", marginTop: 4 }}>
            animated
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <Pig pose={pose} size={64} animate={false} />
          <p style={{ fontSize: 10, color: "#6B4453", marginTop: 4 }}>
            static
          </p>
        </div>
      </div>

      {/* Labels */}
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#3A2129",
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: 13, color: "#6B4453" }}>— {vi}</span>
        </div>
        <p style={{ fontSize: 12, color: "#A8324F", marginTop: 4 }}>{usage}</p>
      </div>
    </div>
  );
}
