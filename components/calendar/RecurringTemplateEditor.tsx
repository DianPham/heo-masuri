"use client";

/**
 * RecurringTemplateEditor — single 7-day grid (no dates, just weekdays) for
 * marking recurring busy hours. Blueprint §6.6.
 *
 * Internal state: 7-element array of Set<hour>. On save, each day's set is
 * coalesced into contiguous { start_minute, end_minute } ranges so the
 * persisted jsonb stays compact.
 */
import { useEffect, useMemo, useState } from "react";

type Range = { start_minute: number; end_minute: number };
type TemplateShape = Range[][];

const WEEKDAY_VI = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function rangesToHourSet(ranges: Range[]): Set<number> {
  const s = new Set<number>();
  for (const r of ranges) {
    const startH = Math.floor(r.start_minute / 60);
    const endH = Math.ceil(r.end_minute / 60);
    for (let h = startH; h < endH; h++) s.add(h);
  }
  return s;
}

function hourSetToRanges(set: Set<number>): Range[] {
  const sorted = [...set].sort((a, b) => a - b);
  const out: Range[] = [];
  let runStart: number | null = null;
  let prev: number | null = null;
  for (const h of sorted) {
    if (runStart === null) {
      runStart = h;
      prev = h;
    } else if (h === (prev as number) + 1) {
      prev = h;
    } else {
      out.push({ start_minute: runStart * 60, end_minute: ((prev as number) + 1) * 60 });
      runStart = h;
      prev = h;
    }
  }
  if (runStart !== null) {
    out.push({ start_minute: runStart * 60, end_minute: ((prev as number) + 1) * 60 });
  }
  return out;
}

type Props = {
  initialTemplate: TemplateShape;
  initialEnabled: boolean;
};

export function RecurringTemplateEditor({ initialTemplate, initialEnabled }: Props) {
  const initialHourSets = useMemo(
    () => initialTemplate.map(rangesToHourSet),
    [initialTemplate]
  );
  const [hourSets, setHourSets] = useState<Set<number>[]>(initialHourSets);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  function toggle(day: number, hour: number) {
    setHourSets((prev) => {
      const next = prev.map((s) => new Set(s));
      if (next[day].has(hour)) next[day].delete(hour);
      else next[day].add(hour);
      return next;
    });
  }

  function clearAll() {
    if (!confirm("Xóa hết mẫu? Hành động này không hoàn tác.")) return;
    setHourSets(Array.from({ length: 7 }, () => new Set<number>()));
  }

  async function handleSave(): Promise<boolean> {
    setSaving(true);
    setSavedHint(null);
    try {
      const template: TemplateShape = hourSets.map(hourSetToRanges);
      const res = await fetch("/api/calendar/recurring-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, enabled }),
      });
      if (!res.ok) {
        alert("Lưu thất bại");
        return false;
      }
      setSavedHint("Đã lưu");
      setTimeout(() => setSavedHint(null), 2000);
      return true;
    } catch {
      alert("Lỗi mạng");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function thisMondayVn(): string {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const dow = nowVn.getUTCDay() || 7;
    const m = new Date(nowVn);
    m.setUTCDate(nowVn.getUTCDate() - (dow - 1));
    return m.toISOString().slice(0, 10);
  }

  async function handleApplyThisWeek() {
    if (applyBusy) return;
    const ok = await handleSave();
    if (!ok) return;
    setApplyBusy(true);
    try {
      const res = await fetch("/api/calendar/recurring-template/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monday: thisMondayVn() }),
      });
      if (!res.ok) {
        alert("Áp dụng thất bại");
        return;
      }
      const data = await res.json();
      alert(`Đã áp dụng cho tuần này: ${data.inserted} sự kiện (xóa ${data.deleted} cũ).`);
    } catch {
      alert("Lỗi mạng");
    } finally {
      setApplyBusy(false);
    }
  }

  async function handleApplyForward() {
    if (applyBusy) return;
    const ok = await handleSave();
    if (!ok) return;
    setApplyBusy(true);
    try {
      const res = await fetch("/api/calendar/recurring-template/apply-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks: 4 }),
      });
      if (!res.ok) {
        alert("Áp dụng thất bại");
        return;
      }
      const data = await res.json();
      const applied = data.processed.filter((p: { applied: boolean }) => p.applied).length;
      const skipped = data.processed.length - applied;
      alert(`Áp dụng cho ${applied} tuần (bỏ qua ${skipped} tuần đã có mẫu).`);
    } catch {
      alert("Lỗi mạng");
    } finally {
      setApplyBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-ink-soft mb-3 leading-snug">
        Đánh dấu giờ bận hàng tuần. Áp dụng để tự động tạo sự kiện cho tuần này
        hoặc 4 tuần tới. Có thể chỉnh lại bất cứ lúc nào — áp dụng lại sẽ ghi
        đè cho tuần đó.
      </p>

      <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 accent-rose-400"
        />
        <span className="text-sm text-ink">Bật mẫu lặp (chỉ để ghi nhớ — không tự áp dụng)</span>
      </label>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,201,213,0.4)" }}>
        {/* sticky header */}
        <div
          className="grid sticky top-0 z-10"
          style={{
            gridTemplateColumns: `50px repeat(7, 1fr)`,
            backgroundColor: "rgba(255,249,245,0.96)",
            borderBottom: "1px solid rgba(255,201,213,0.4)",
          }}
        >
          <div />
          {WEEKDAY_VI.map((d) => (
            <div key={d} className="text-center py-2 border-l text-xs font-semibold text-ink-soft" style={{ borderColor: "rgba(255,201,213,0.25)" }}>
              {d}
            </div>
          ))}
        </div>

        <div className="relative" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <div className="grid" style={{ gridTemplateColumns: `50px repeat(7, 1fr)`, gridAutoRows: 36 }}>
            {Array.from({ length: 24 }).map((_, hour) => (
              <TemplateRow
                key={hour}
                hour={hour}
                hourSets={hourSets}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleSave}
          disabled={saving || applyBusy}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: "#C4667A", opacity: saving || applyBusy ? 0.5 : 1 }}
        >
          {saving ? "Đang lưu…" : "Lưu mẫu"}
        </button>
        <button
          onClick={handleApplyThisWeek}
          disabled={saving || applyBusy}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink"
          style={{
            border: "1px solid rgba(255,201,213,0.6)",
            backgroundColor: "rgba(255,201,213,0.25)",
            opacity: saving || applyBusy ? 0.5 : 1,
          }}
        >
          Áp dụng tuần này
        </button>
        <button
          onClick={handleApplyForward}
          disabled={saving || applyBusy}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink"
          style={{
            border: "1px solid rgba(255,201,213,0.6)",
            backgroundColor: "rgba(255,201,213,0.25)",
            opacity: saving || applyBusy ? 0.5 : 1,
          }}
        >
          Áp dụng 4 tuần tới
        </button>
      </div>

      <div className="flex justify-between items-center mt-3">
        <button onClick={clearAll} className="text-xs text-rose-500 underline underline-offset-2">
          Xóa hết
        </button>
        {savedHint && <p className="text-xs text-green-600">{savedHint}</p>}
      </div>
    </div>
  );
}

function TemplateRow({
  hour,
  hourSets,
  onToggle,
}: {
  hour: number;
  hourSets: Set<number>[];
  onToggle: (day: number, hour: number) => void;
}) {
  return (
    <>
      <div
        className="text-xs text-ink-soft text-right pr-2 flex items-start justify-end pt-1 border-r"
        style={{ borderColor: "rgba(255,201,213,0.25)" }}
      >
        {`${hour.toString().padStart(2, "0")}:00`}
      </div>
      {hourSets.map((set, day) => {
        const busy = set.has(hour);
        return (
          <button
            key={day}
            onClick={() => onToggle(day, hour)}
            className="border-r border-b transition-colors hover:bg-rose-50/50"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: busy ? "rgba(255,201,213,0.85)" : "transparent",
              cursor: "pointer",
            }}
            aria-label={busy ? "Bận" : "Trống"}
          />
        );
      })}
    </>
  );
}
