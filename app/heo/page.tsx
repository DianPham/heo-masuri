import { Pig } from "@/components/theme/Pig";

// Placeholder — replaced at Checkpoint 3 (missing button),
// Checkpoint 4 (thinking/hug/kiss), and Checkpoint 6 (countdown).
export default function HeoHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-96px)] px-8">
      <div className="flex flex-col items-center gap-6 text-center w-full">
        <Pig pose="neutral" size={120} />

        <div className="space-y-2">
          <h1
            className="font-display text-4xl text-ink italic"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            Chào Heo 🐷
          </h1>
          <p className="font-body text-ink-soft text-sm leading-relaxed">
            Đang chuẩn bị mọi thứ cho em...
          </p>
        </div>

        {/* Upcoming features — visible once built at later checkpoints */}
        <div className="flex flex-wrap justify-center gap-2">
          {["Nút nhớ Masuri", "Đếm ngược", "Ôm & Hôn", "Heo không ổn"].map(
            (label) => (
              <span
                key={label}
                className="px-3.5 py-1.5 rounded-full bg-rose-100 text-ink-soft text-xs font-body font-medium opacity-70"
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
