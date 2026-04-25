import { Pig } from "@/components/theme/Pig";

export default function HeoHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-80px)] px-6 gap-10">
      {/* Placeholder — will be built in Checkpoint 3 (missing button) & 4 (thinking) */}
      <div className="text-center space-y-2">
        <Pig pose="neutral" size={96} className="mx-auto" />
        <h1
          className="font-display text-3xl text-ink italic mt-4"
          style={{ fontVariationSettings: "'opsz' 60" }}
        >
          Chào Heo 🐷
        </h1>
        <p className="font-body text-ink-soft text-sm">
          Đang xây dựng... sắp xong rồi nhé 💕
        </p>
      </div>
    </div>
  );
}
