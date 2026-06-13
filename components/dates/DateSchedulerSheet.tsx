"use client";

/**
 * DateSchedulerSheet — shared scheduler modal. Blueprint §7.5.
 *
 * Used from /dates/plan (PlanIndex), /calendar (empty-cell "Plan a date"),
 * /calendar/important-dates (future row → "Plan a date for this day"), and the
 * /heo and /masuri home cards.
 *
 * Props:
 *  - defaultStart / defaultEnd: ISO. If both omitted, fetches next-free-overlap.
 *  - onClose: closes the sheet.
 *  - onCreated?: called after a successful create with the new ScheduledDate.
 *                Default behavior: router.push(`/dates/plan/${id}`).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ScheduledDate = {
  id: string;
  start_at: string;
  end_at: string;
  title: string | null;
  dress_code: string | null;
  dress_code_emoji: string | null;
};

function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  // datetime-local input expects local wall-clock time (no offset).
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  return new Date(local).toISOString();
}

export function DateSchedulerSheet({
  defaultStart,
  defaultEnd,
  defaultTitle,
  onClose,
  onCreated,
}: {
  defaultStart?: string;
  defaultEnd?: string;
  defaultTitle?: string;
  onClose: () => void;
  onCreated?: (d: ScheduledDate) => void;
}) {
  const router = useRouter();
  const [start, setStart] = useState<string>(defaultStart ? isoToLocal(defaultStart) : "");
  const [end, setEnd] = useState<string>(defaultEnd ? isoToLocal(defaultEnd) : "");
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [dressCode, setDressCode] = useState("");
  const [dressEmoji, setDressEmoji] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(!defaultStart && !defaultEnd);

  useEffect(() => {
    if (defaultStart || defaultEnd) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dates/scheduled/next-free-overlap", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const d = await res.json();
        if (cancelled) return;
        setStart(isoToLocal(d.start_at));
        setEnd(isoToLocal(d.end_at));
      } finally {
        if (!cancelled) setLoadingDefaults(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultStart, defaultEnd]);

  async function submit() {
    if (busy) return;
    if (!start || !end) {
      alert("Cần chọn thời gian");
      return;
    }
    const startIso = localToIso(start);
    const endIso = localToIso(end);
    if (new Date(endIso) <= new Date(startIso)) {
      alert("Kết thúc phải sau bắt đầu");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/dates/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: startIso,
          end_at: endIso,
          title: title.trim() || null,
          dress_code: dressCode.trim() || null,
          dress_code_emoji: dressEmoji.trim() || null,
        }),
      });
      if (!res.ok) {
        alert("Tạo thất bại");
        return;
      }
      const { date } = (await res.json()) as { date: ScheduledDate };
      if (onCreated) {
        onCreated(date);
      } else {
        router.push(`/dates/plan/${date.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3"
        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-handwritten)" }}>
          Lên kế hoạch hẹn 💕
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bắt đầu">
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={loadingDefaults}
              className="w-full text-sm rounded-xl px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}
            />
          </Field>
          <Field label="Kết thúc">
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={loadingDefaults}
              className="w-full text-sm rounded-xl px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}
            />
          </Field>
        </div>

        <Field label="Tiêu đề (tùy chọn)">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hẹn cuối tuần"
            className="w-full text-sm rounded-xl px-3 py-2 outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Dress code (tùy chọn)">
            <input
              type="text"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              placeholder="Đỏ rượu, casual…"
              className="w-full text-sm rounded-xl px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}
            />
          </Field>
          <Field label="Emoji">
            <input
              type="text"
              value={dressEmoji}
              onChange={(e) => setDressEmoji(e.target.value.slice(0, 16))}
              placeholder="👗"
              className="w-14 text-base rounded-xl px-2 py-2 outline-none text-center"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}
            />
          </Field>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={submit}
            disabled={busy || loadingDefaults}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#C4667A", opacity: busy || loadingDefaults ? 0.5 : 1 }}
          >
            {busy ? "Đang tạo…" : "Tạo & lên outline"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-ink-soft"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
