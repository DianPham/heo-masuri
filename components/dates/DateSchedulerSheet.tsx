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

  // Preserve the duration when the user edits the start: shift end by the same
  // delta so they don't end up with end < start. Default duration: 2h.
  function changeStart(next: string) {
    const prevStartMs = start ? new Date(start).getTime() : NaN;
    const prevEndMs = end ? new Date(end).getTime() : NaN;
    const duration =
      Number.isFinite(prevStartMs) && Number.isFinite(prevEndMs) && prevEndMs > prevStartMs
        ? prevEndMs - prevStartMs
        : 2 * 3_600_000;
    setStart(next);
    const nextStartMs = new Date(next).getTime();
    if (Number.isFinite(nextStartMs)) {
      const nextEnd = new Date(nextStartMs + duration);
      const pad = (n: number) => String(n).padStart(2, "0");
      setEnd(
        `${nextEnd.getFullYear()}-${pad(nextEnd.getMonth() + 1)}-${pad(nextEnd.getDate())}T${pad(nextEnd.getHours())}:${pad(nextEnd.getMinutes())}`
      );
    }
  }
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
      alert("Chọn giờ giúp mình với 💕");
      return;
    }
    const startIso = localToIso(start);
    const endIso = localToIso(end);
    if (new Date(endIso) <= new Date(startIso)) {
      alert("Giờ kết thúc phải sau giờ bắt đầu nha");
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
        alert("Không tạo được, thử lại nha");
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(20, 10, 14, 0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 space-y-4"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="section-eyebrow mb-1.5">Lên kế hoạch hẹn</p>
          <h2
            className="font-medium tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)", lineHeight: 1.15 }}
          >
            Hẹn nhau lúc nào?
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bắt đầu">
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => changeStart(e.target.value)}
              disabled={loadingDefaults}
              className="input-base"
            />
          </Field>
          <Field label="Kết thúc">
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={loadingDefaults}
              className="input-base"
            />
          </Field>
        </div>

        <Field label="Tên buổi hẹn">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hẹn cuối tuần"
            className="input-base"
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Dress code">
            <input
              type="text"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              placeholder="Đỏ rượu, casual…"
              className="input-base"
            />
          </Field>
          <Field label="Emoji">
            <input
              type="text"
              value={dressEmoji}
              onChange={(e) => setDressEmoji(e.target.value.slice(0, 16))}
              placeholder="👗"
              className="input-base text-center"
              style={{ width: 56, padding: "0.5625rem 0.5rem" }}
            />
          </Field>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={submit}
            disabled={busy || loadingDefaults}
            className="btn-primary flex-1"
          >
            {busy ? "Đang tạo…" : "Tạo & lên kế hoạch"}
          </button>
          <button onClick={onClose} className="btn-ghost">
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
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
