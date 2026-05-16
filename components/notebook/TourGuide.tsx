"use client";

/**
 * TourGuide — first-run overlay walking Heo through Phase 1.5 notebook features.
 * Shown once per device (localStorage key "nb_tour_v2_done").
 * Dismissed automatically on last card → continue; or by "Bỏ qua" at any step.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Pig } from "@/components/theme/Pig";

const LS_KEY = "nb_tour_v2_done";

interface Slide {
  emoji: string;
  title: string;
  body: string;
  pigPose: "studying" | "cheering" | "thinking" | "neutral" | "sleepy";
}

const SLIDES: Slide[] = [
  {
    emoji: "📓",
    title: "Trang học mỗi ngày",
    body: 'Mỗi ngày Masuri sẽ chuẩn bị một trang tiếng Anh cho Heo. Trang mở lúc 6 giờ sáng. Học xong rồi thì streak tăng lên nha! 🔥',
    pigPose: "studying",
  },
  {
    emoji: "🔥",
    title: "Streak & ngày nghỉ",
    body: 'Streak là số ngày liên tiếp Heo học. Nếu cần nghỉ một ngày, nhấn "Dùng ngày nghỉ" — streak sẽ không bị mất. Masuri cấp mỗi tuần một ngày nghỉ 🌸',
    pigPose: "neutral",
  },
  {
    emoji: "❓",
    title: "Hỏi Masuri",
    body: 'Khi đọc trang học, nhấn giữ bất kỳ từ tiếng Anh nào để hỏi Masuri. Masuri sẽ trả lời trong hộp "Thư & Trả lời". Heo sẽ nhận thông báo khi có câu trả lời mới 💬',
    pigPose: "thinking",
  },
  {
    emoji: "📖",
    title: "Sổ từ vựng",
    body: 'Mỗi khi Heo hoàn thành một trang học, các từ quan trọng sẽ tự động lưu vào sổ từ vựng. Heo cũng có thể nhấn vào từ và chọn 📚 để lưu thêm 🌟',
    pigPose: "cheering",
  },
  {
    emoji: "💌",
    title: "Thư cho Masuri",
    body: 'Mỗi Chủ nhật, Heo có thể viết thư kể cho Masuri nghe về tuần vừa rồi — hoặc chơi Two Truths and a Lie. Masuri sẽ trả lời và hiện trong mục Thư 💕',
    pigPose: "neutral",
  },
  {
    emoji: "📸",
    title: "Bộ sưu tập",
    body: 'Mỗi trang học hoàn thành sẽ được lưu vào bộ sưu tập của Heo như một tấm ảnh polaroid dễ thương. Heo có thể xem lại bất kỳ lúc nào mà không mất streak 🌸',
    pigPose: "cheering",
  },
];

export function TourGuide() {
  const [step, setStep] = useState<number | null>(null); // null = not yet checked

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) {
        setStep(0);
      }
    } catch {
      // localStorage blocked
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(LS_KEY, "1"); } catch { /* ignore */ }
    setStep(null);
  }

  function next() {
    if (step === null) return;
    if (step >= SLIDES.length - 1) {
      dismiss();
    } else {
      setStep(step + 1);
    }
  }

  if (step === null) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <AnimatePresence>
      {step !== null && (
        <motion.div
          key="tour-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8"
          style={{ backgroundColor: "rgba(58,33,41,0.55)", backdropFilter: "blur(3px)" }}
          onClick={dismiss}
        >
          <motion.div
            key={`slide-${step}`}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="w-full max-w-sm rounded-3xl p-6 relative"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,201,213,0.08) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              backgroundColor: "#FFF9F5",
              boxShadow: "0 24px 60px rgba(58,33,41,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-5">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 6,
                    backgroundColor:
                      i === step
                        ? "#E97A95"
                        : i < step
                        ? "rgba(233,122,149,0.35)"
                        : "rgba(200,200,200,0.35)",
                  }}
                />
              ))}
            </div>

            {/* Pig illustration */}
            <div className="flex justify-center mb-4">
              <Pig pose={slide.pigPose} size={72} animate />
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <p className="text-3xl mb-2">{slide.emoji}</p>
              <h2
                className="text-xl font-bold text-ink mb-2"
                style={{ fontFamily: "var(--font-handwritten)" }}
              >
                {slide.title}
              </h2>
              <p className="text-sm text-ink-soft leading-relaxed">{slide.body}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              {!isLast && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-rose-400 border border-rose-200 active:scale-95 transition-transform"
                >
                  Bỏ qua
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform"
                style={{
                  backgroundColor: "#E97A95",
                  boxShadow: "0 4px 12px rgba(233,122,149,0.4)",
                }}
              >
                {isLast ? "Bắt đầu học 🌸" : "Tiếp theo →"}
              </button>
            </div>

            {/* Step counter */}
            <p className="text-center text-xs text-ink-soft mt-3 opacity-60">
              {step + 1} / {SLIDES.length}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
