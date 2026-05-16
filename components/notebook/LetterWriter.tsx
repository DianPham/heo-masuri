"use client";

/**
 * LetterWriter — Heo's weekly letter writing UI.
 * Two modes: weekly_letter (free text) and two_truths (3 sentences + lie picker).
 * No spellcheck, no grammar check, no AI suggestions — the safe space.
 */
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Prompt = {
  id: string;
  prompt_vi: string;
  prompt_en: string;
  starter_words: string[];
  difficulty: number;
};

export function LetterWriter() {
  const [mode, setMode] = useState<"letter" | "two_truths">("letter");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [showEN, setShowEN] = useState(false);
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Two truths state
  const [truths, setTruths] = useState(["", "", ""]);
  const [lieIndex, setLieIndex] = useState<1 | 2 | 3 | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Load prompt
    fetch("/api/notebook/letter/prompts/today")
      .then((r) => r.json())
      .then(({ prompt: p }) => setPrompt(p))
      .catch(() => {});

    // Restore draft from localStorage
    const saved = localStorage.getItem("letter_draft");
    if (saved) {
      try {
        const { body: b, mode: m } = JSON.parse(saved);
        if (b) { setBody(b); setDraft(true); }
        if (m) setMode(m);
      } catch { /* ignore */ }
    }
  }, []);

  function wordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function insertStarter(word: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? body.length;
    const before = body.slice(0, pos);
    const after = body.slice(pos);
    const newBody = before + (before.length && !before.endsWith(" ") ? " " : "") + word + " " + after;
    setBody(newBody);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = pos + word.length + 2; }, 0);
  }

  function saveDraft() {
    localStorage.setItem("letter_draft", JSON.stringify({ body, mode }));
    setDraft(true);
  }

  async function sendLetter() {
    if (sending) return;

    if (mode === "letter" && wordCount(body) === 0) return;
    if (mode === "two_truths") {
      if (truths.some((t) => !t.trim()) || lieIndex === null) return;
    }

    setSending(true);
    try {
      const payload =
        mode === "two_truths"
          ? {
              kind: "two_truths",
              body: truths.join("\n"),
              attachments: { truths_lie_index: lieIndex },
              language: "en",
            }
          : {
              kind: "weekly_letter",
              body,
              prompt_id: prompt?.id ?? null,
              language: "en",
            };

      const res = await fetch("/api/notebook/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Có lỗi xảy ra");
        return;
      }

      localStorage.removeItem("letter_draft");
      setSent(true);
    } catch {
      alert("Mạng đang lỗi, thử lại nha Heo");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-8 pb-16"
           style={{ backgroundColor: "#FFF9F5" }}>
        <span style={{ fontSize: 64 }}>💌</span>
        <p className="text-2xl font-bold text-ink text-center mt-6 mb-2"
           style={{ fontFamily: "var(--font-handwritten)" }}>
          Đã gửi cho Masuri rồi 💕
        </p>
        <p className="text-sm text-ink-soft text-center mb-8">
          Masuri sẽ đọc và trả lời sớm thôi nha 🌸
        </p>
        <button
          onClick={() => router.push("/heo/notebook/letter")}
          className="bg-rose-400 text-white text-sm font-semibold px-6 py-2.5 rounded-2xl"
        >
          Quay lại hộp thư
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-8" style={{ backgroundColor: "#FFF9F5" }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-ink-soft text-sm">← Quay lại</button>
        <h1 className="text-xl font-bold text-ink flex-1"
            style={{ fontFamily: "var(--font-display)" }}>
          Viết thư
        </h1>
      </div>

      {/* Mode toggle */}
      <div className="px-5 mb-4">
        <div className="flex rounded-2xl overflow-hidden border border-rose-100"
             style={{ backgroundColor: "rgba(255,249,245,0.8)" }}>
          {(["letter", "two_truths"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === m ? "rgba(255,201,213,0.6)" : "transparent",
                color: mode === m ? "#C4667A" : "#888",
              }}
            >
              {m === "letter" ? "📨 Viết thư" : "🎭 Two Truths"}
            </button>
          ))}
        </div>
      </div>

      {mode === "letter" ? (
        <LetterMode
          prompt={prompt}
          showEN={showEN}
          setShowEN={setShowEN}
          body={body}
          setBody={setBody}
          textareaRef={textareaRef}
          insertStarter={insertStarter}
          draft={draft}
          saveDraft={saveDraft}
          wordCount={wordCount}
          sending={sending}
          sendLetter={sendLetter}
        />
      ) : (
        <TwoTruthsMode
          truths={truths}
          setTruths={setTruths}
          lieIndex={lieIndex}
          setLieIndex={setLieIndex}
          sending={sending}
          sendLetter={sendLetter}
        />
      )}
    </div>
  );
}

// ── Letter mode ───────────────────────────────────────────────
function LetterMode({
  prompt, showEN, setShowEN, body, setBody, textareaRef, insertStarter,
  draft, saveDraft, wordCount, sending, sendLetter,
}: {
  prompt: Prompt | null;
  showEN: boolean;
  setShowEN: (v: boolean) => void;
  body: string;
  setBody: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  insertStarter: (w: string) => void;
  draft: boolean;
  saveDraft: () => void;
  wordCount: (t: string) => number;
  sending: boolean;
  sendLetter: () => void;
}) {
  return (
    <div className="px-5 space-y-4">
      {/* Prompt */}
      {prompt && (
        <div className="rounded-2xl px-4 py-3"
             style={{ backgroundColor: "rgba(237,232,245,0.6)", border: "1px solid rgba(196,168,220,0.4)" }}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-ink leading-relaxed">
              {showEN ? prompt.prompt_en : prompt.prompt_vi}
            </p>
            <button
              onClick={() => setShowEN(!showEN)}
              className="text-xs text-purple-500 font-medium shrink-0 mt-0.5"
            >
              {showEN ? "VI" : "EN"}
            </button>
          </div>

          {/* Starter words */}
          {prompt.starter_words.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {prompt.starter_words.map((w) => (
                <button
                  key={w}
                  onClick={() => insertStarter(w)}
                  className="text-xs px-2.5 py-1 rounded-xl font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.8)", color: "#8B5CF6", border: "1px solid rgba(196,168,220,0.5)" }}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Heo viết gì cũng được nha, không cần hoàn hảo 🌸"
        rows={10}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="w-full rounded-2xl px-4 py-3 text-sm text-ink leading-relaxed resize-none outline-none"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(255,201,213,0.4)",
          fontFamily: "var(--font-body)",
        }}
      />

      {/* Word count */}
      <p className="text-xs text-ink-soft text-right -mt-2 pr-1">
        Heo đã viết {wordCount(body)} từ
      </p>

      {draft && (
        <p className="text-xs text-ink-soft text-center">✓ Đã lưu nháp</p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={saveDraft}
          className="flex-1 py-2.5 rounded-2xl text-sm font-medium"
          style={{ backgroundColor: "rgba(255,201,213,0.3)", color: "#C4667A" }}
        >
          Lưu nháp
        </button>
        <button
          onClick={sendLetter}
          disabled={sending || wordCount(body) === 0}
          className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-opacity"
          style={{
            backgroundColor: "#C4667A",
            opacity: sending || wordCount(body) === 0 ? 0.5 : 1,
            boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
          }}
        >
          {sending ? "Đang gửi..." : "Gửi cho Masuri 💕"}
        </button>
      </div>
    </div>
  );
}

// ── Two truths mode ───────────────────────────────────────────
function TwoTruthsMode({
  truths, setTruths, lieIndex, setLieIndex, sending, sendLetter,
}: {
  truths: string[];
  setTruths: (v: string[]) => void;
  lieIndex: 1 | 2 | 3 | null;
  setLieIndex: (v: 1 | 2 | 3 | null) => void;
  sending: boolean;
  sendLetter: () => void;
}) {
  const canSend = truths.every((t) => t.trim()) && lieIndex !== null;

  return (
    <div className="px-5 space-y-4">
      {/* Instructions */}
      <div className="rounded-2xl px-4 py-3"
           style={{ backgroundColor: "rgba(237,232,245,0.6)", border: "1px solid rgba(196,168,220,0.4)" }}>
        <p className="text-sm font-medium text-ink">🎭 Two Truths and a Lie</p>
        <p className="text-xs text-ink-soft mt-1 leading-relaxed">
          Viết 3 câu tiếng Anh về bản thân Heo — 2 câu thật, 1 câu bịa. Masuri sẽ đoán câu nào sai nha!
        </p>
      </div>

      {/* Three inputs */}
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <p className="text-xs font-medium text-ink-soft mb-1.5">Câu {i + 1}</p>
          <textarea
            value={truths[i]}
            onChange={(e) => {
              const next = [...truths];
              next[i] = e.target.value;
              setTruths(next);
            }}
            placeholder={`Viết câu ${i + 1} ở đây...`}
            rows={2}
            spellCheck={false}
            autoCorrect="off"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink leading-relaxed resize-none outline-none"
            style={{
              backgroundColor: lieIndex === (i + 1) as 1|2|3
                ? "rgba(237,232,245,0.8)"
                : "rgba(255,255,255,0.9)",
              border: lieIndex === (i + 1) as 1|2|3
                ? "1px solid rgba(196,168,220,0.7)"
                : "1px solid rgba(255,201,213,0.4)",
            }}
          />
        </div>
      ))}

      {/* Lie picker */}
      <div>
        <p className="text-xs font-medium text-ink-soft mb-2">Câu nào là câu bịa?</p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setLieIndex(n)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: lieIndex === n ? "rgba(196,168,220,0.6)" : "rgba(255,249,245,0.9)",
                border: `1px solid ${lieIndex === n ? "rgba(196,168,220,0.8)" : "rgba(255,201,213,0.3)"}`,
                color: lieIndex === n ? "#6B21A8" : "#888",
              }}
            >
              Câu {n}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={sendLetter}
        disabled={sending || !canSend}
        className="w-full py-2.5 rounded-2xl text-sm font-semibold text-white transition-opacity"
        style={{
          backgroundColor: "#C4667A",
          opacity: sending || !canSend ? 0.5 : 1,
          boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
        }}
      >
        {sending ? "Đang gửi..." : "Gửi cho Masuri 🎭"}
      </button>
    </div>
  );
}
