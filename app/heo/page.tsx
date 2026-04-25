import { Pig } from "@/components/theme/Pig";

// Placeholder — will be replaced at Checkpoint 3 (missing button),
// Checkpoint 4 (thinking/hug/kiss), and Checkpoint 6 (countdown).
export default function HeoHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-80px)] px-8 gap-8">
      <div className="text-center space-y-4">
        <Pig pose="neutral" size={108} className="mx-auto" />

        <div className="space-y-1.5 pt-2">
          <h1
            className="font-display text-3xl text-ink italic"
            style={{ fontVariationSettings: "'opsz' 60" }}
          >
            Chào Heo 🐷
          </h1>
          <p className="font-body text-ink-soft text-sm">
            Đang chuẩn bị mọi thứ cho em...
          </p>
        </div>

        {/* Feature preview pills */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {["Nút nhớ Masuri", "Đếm ngược", "Ôm & Hôn", "Heo không ổn"].map(
            (label) => (
              <span
                key={label}
                className="px-3 py-1.5 rounded-full bg-rose-100 text-ink-soft text-xs font-body opacity-60"
              >
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
