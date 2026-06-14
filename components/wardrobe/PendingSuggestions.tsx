"use client";

/**
 * PendingSuggestions — shown on /wardrobe (own page). The viewer's pending
 * suggestions FROM the partner. Accept / decline inline. Counter requires
 * the editor to pick from own wardrobe — deferred to a second round.
 */
import { useState } from "react";
import type { OutfitSuggestion, VisibleWardrobeItem } from "./types";

type SuggestionWithItem = OutfitSuggestion & { item?: VisibleWardrobeItem };

export function PendingSuggestions({ initial }: { initial: SuggestionWithItem[] }) {
  const [list, setList] = useState<SuggestionWithItem[]>(initial);
  if (list.length === 0) return null;

  async function respond(id: string, status: "accepted" | "declined") {
    const res = await fetch(`/api/wardrobe/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setList((prev) => prev.filter((s) => s.id !== id));
    else alert("Không gửi được, thử lại nha");
  }

  return (
    <section className="mb-6">
      <h2 className="section-eyebrow mb-2.5">Gợi ý từ người ấy</h2>
      <ul className="space-y-2.5">
        {list.map((s) => {
          const src = s.item?.thumbnail_signed_url ?? s.item?.photo_signed_url ?? "";
          return (
            <li key={s.id} className="surface-card p-4 flex gap-3.5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div
                className="w-16 h-16 rounded-xl flex-shrink-0"
                style={{
                  background: "rgba(58,33,41,0.04)",
                  backgroundImage: `url(${src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold tracking-tight truncate" style={{ color: "var(--color-ink)" }}>
                  {s.item?.label || "Đồ chưa đặt tên"}
                </p>
                {s.note && (
                  <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--color-ink-soft)" }}>
                    {s.note}
                  </p>
                )}
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => respond(s.id, "accepted")}
                    className="btn-primary"
                    style={{ padding: "0.4375rem 0.875rem", fontSize: "0.75rem" }}
                  >
                    Chốt
                  </button>
                  <button
                    onClick={() => respond(s.id, "declined")}
                    className="btn-ghost"
                    style={{ padding: "0.4375rem 0.875rem", fontSize: "0.75rem" }}
                  >
                    Thử cái khác
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
