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
    else alert("Không phản hồi được");
  }

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Gợi ý đang chờ</h2>
      <ul className="space-y-3">
        {list.map((s) => {
          const src = s.item?.thumbnail_signed_url ?? s.item?.photo_signed_url ?? "";
          return (
            <li key={s.id} className="rounded-2xl bg-white p-3 flex gap-3" style={{ border: "1px solid rgba(255,201,213,0.4)" }}>
              <div
                className="w-16 h-16 rounded-xl flex-shrink-0 bg-rose-50"
                style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{s.item?.label || "(no label)"}</p>
                {s.note && <p className="text-xs text-ink-soft mt-0.5 line-clamp-2">{s.note}</p>}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => respond(s.id, "accepted")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: "#C4667A" }}
                  >
                    Chốt
                  </button>
                  <button
                    onClick={() => respond(s.id, "declined")}
                    className="px-3 py-1.5 rounded-xl text-xs text-ink-soft"
                    style={{ border: "1px solid rgba(220,220,220,0.6)" }}
                  >
                    Hôm nay thử cái khác nha
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
