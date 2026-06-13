"use client";

/**
 * PlanIndex — list of planning sessions + quick-create form.
 * CP9 entry point; CP10 will replace the form with the proper date scheduler.
 */
import { useState } from "react";
import Link from "next/link";
import type { ScheduledDate } from "./PlanShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 16);
}
function plusHoursIso(iso: string, h: number): string {
  return new Date(new Date(iso).getTime() + h * 3_600_000).toISOString().slice(0, 16);
}

export function PlanIndex({ initial }: { initial: ScheduledDate[] }) {
  const [list, setList] = useState<ScheduledDate[]>(initial);
  const [creating, setCreating] = useState(false);
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(plusHoursIso(todayIso(), 3));
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dates/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: new Date(start).toISOString(),
          end_at: new Date(end).toISOString(),
          title: title.trim() || null,
        }),
      });
      if (!res.ok) { alert("Tạo thất bại"); return; }
      const { date } = await res.json();
      setList((p) => [date, ...p]);
      setCreating(false);
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {creating ? (
        <div className="rounded-2xl bg-white p-4 mb-4 space-y-3" style={{ border: "1px solid rgba(255,201,213,0.6)" }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu">
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2 outline-none"
                style={{ border: "1px solid rgba(220,220,220,0.6)" }} />
            </Field>
            <Field label="Kết thúc">
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2 outline-none"
                style={{ border: "1px solid rgba(220,220,220,0.6)" }} />
            </Field>
          </div>
          <Field label="Tiêu đề (tùy chọn)">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Hẹn cuối tuần"
              className="w-full text-sm rounded-xl px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }} />
          </Field>
          <div className="flex gap-2">
            <button onClick={create} disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#C4667A", opacity: busy ? 0.5 : 1 }}>
              {busy ? "Đang tạo…" : "Tạo & bắt đầu lên kế hoạch"}
            </button>
            <button onClick={() => setCreating(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-ink-soft"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}>
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="w-full py-3 mb-4 rounded-2xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#C4667A", boxShadow: "0 4px 12px rgba(196,102,122,0.3)" }}>
          + Lên kế hoạch mới
        </button>
      )}

      {list.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-10">Chưa có kế hoạch nào.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/dates/plan/${p.id}`}
                className="block rounded-2xl bg-white p-3 hover:bg-rose-50 transition-colors"
                style={{ border: "1px solid rgba(255,201,213,0.4)" }}>
                <p className="text-sm font-semibold text-ink">{p.title || "(không tên)"}</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {new Date(p.start_at).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="text-[10px] text-rose-500 mt-1">
                  {p.itinerary ? "✅ Đã spin" : p.outline_snapshot ? "📝 Đang điền" : "🆕 Chọn template"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
