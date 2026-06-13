"use client";

/**
 * PlanIndex — list of planning sessions + CTA to open DateSchedulerSheet.
 * CP10: form moved into DateSchedulerSheet (shared with calendar/home).
 */
import { useState } from "react";
import Link from "next/link";
import type { ScheduledDate } from "./PlanShell";
import { DateSchedulerSheet } from "./DateSchedulerSheet";

export function PlanIndex({ initial }: { initial: ScheduledDate[] }) {
  const [list, setList] = useState<ScheduledDate[]>(initial);
  const [scheduling, setScheduling] = useState(false);

  return (
    <div>
      <button
        onClick={() => setScheduling(true)}
        className="w-full py-3 mb-4 rounded-2xl text-sm font-semibold text-white active:scale-[0.98] transition-transform"
        style={{ backgroundColor: "#C4667A", boxShadow: "0 4px 12px rgba(196,102,122,0.3)" }}
      >
        + Lên kế hoạch mới
      </button>

      {list.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-10">Chưa có kế hoạch nào.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/dates/plan/${p.id}`}
                className="block rounded-2xl bg-white p-3 hover:bg-rose-50 transition-colors"
                style={{ border: "1px solid rgba(255,201,213,0.4)" }}>
                <p className="text-sm font-semibold text-ink">
                  {p.title || "(không tên)"}
                  {p.dress_code_emoji ? <span className="ml-1">{p.dress_code_emoji}</span> : null}
                </p>
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

      {scheduling && (
        <DateSchedulerSheet
          onClose={() => setScheduling(false)}
          onCreated={(d) => {
            setList((p) => [d as ScheduledDate, ...p]);
            setScheduling(false);
            // PlanIndex stays on the index — user taps through to outline.
            window.location.href = `/dates/plan/${d.id}`;
          }}
        />
      )}
    </div>
  );
}
