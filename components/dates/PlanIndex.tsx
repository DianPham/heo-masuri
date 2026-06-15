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
      <button onClick={() => setScheduling(true)} className="btn-primary w-full mb-5 py-3">
        + Lên kế hoạch hẹn
      </button>

      {list.length === 0 ? (
        <div
          className="surface-card text-center py-10 px-6"
          style={{ background: "transparent", borderStyle: "dashed", borderColor: "var(--color-hairline-strong)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Chưa có hẹn nào sắp tới.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-ink-mute)" }}>
            Bắt đầu một buổi để cùng lên kế hoạch.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => {
            const status = p.itinerary ? "done" : p.outline_snapshot ? "drafting" : "new";
            const statusLabel =
              status === "done" ? "Đã chốt" : status === "drafting" ? "Đang lên kế hoạch" : "Chọn khung mẫu";
            return (
              <li key={p.id}>
                <Link
                  href={`/dates/plan/${p.id}`}
                  className="surface-card flex items-center gap-4 p-4 hover:translate-y-[-1px] transition-transform"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
                      {p.title || "Buổi hẹn chưa đặt tên"}
                      {p.dress_code_emoji ? <span className="ml-1.5">{p.dress_code_emoji}</span> : null}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                      {new Date(p.start_at).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <span
                    className="chip flex-shrink-0"
                    style={
                      status === "done"
                        ? { background: "rgba(156, 175, 136, 0.14)", color: "#5C7A4A" }
                        : status === "drafting"
                        ? { background: "var(--color-accent-tint)", color: "var(--color-accent)" }
                        : undefined
                    }
                  >
                    {statusLabel}
                  </span>
                  <span aria-hidden style={{ color: "var(--color-ink-mute)" }}>
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {scheduling && (
        <DateSchedulerSheet
          onClose={() => setScheduling(false)}
          onCreated={(d) => {
            setList((p) => [d as ScheduledDate, ...p]);
            setScheduling(false);
            // After create, jump straight into the template picker.
            window.location.href = `/dates/plan/${d.id}`;
          }}
        />
      )}
    </div>
  );
}
