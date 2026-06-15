"use client";

/**
 * PlanShell — the decision-flipper UI. Blueprint §7.4.
 *
 * Phase 1: no outline_snapshot yet → template picker (8 templates).
 * Phase 2: outline_snapshot present, no itinerary → edit slots + fill candidates per slot.
 * Phase 3: itinerary present → reveal + view (re-spin or pick manually per slot).
 *
 * Realtime sync of cross-user candidate adds is deferred — for CP9, refresh
 * to see the partner's additions. Adding broadcast on PATCH outline_snapshot
 * is the natural next iteration.
 */
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { DateIdea } from "@/components/dates/DateIdeasGrid";
import type { SlotCandidate } from "@/lib/spin";

export type Template = {
  id: string;
  label_vi: string;
  label_en: string;
  description_vi: string | null;
  slots: { type: string; label_vi: string; label_en: string }[];
};

export type ScheduledDate = {
  id: string;
  created_by: string;
  start_at: string;
  end_at: string;
  title: string | null;
  dress_code: string | null;
  dress_code_emoji: string | null;
  calendar_event_id: string | null;
  outline_template: string | null;
  outline_snapshot: OutlineSlot[] | null;
  itinerary: ItineraryPick[] | null;
  flipped_at: string | null;
  status: "planning" | "ready" | "done" | "cancelled";
};

export type OutlineSlot = {
  id: string;
  type: string;
  label_vi: string;
  label_en?: string;
  candidates: SlotCandidate[];
};

export type ItineraryPick = {
  slotIndex: number;
  type: string | undefined;
  label_vi: string | undefined;
  pick: SlotCandidate | null;
  manually_overridden: boolean;
};

const SLOT_LABEL: Record<string, string> = {
  eat: "🍜 Ăn", drink: "☕ Uống", activity: "🎨 Hoạt động", walk: "🚶 Đi dạo",
  movie: "🎬 Phim", drive: "🚗 Lái xe", home: "🏠 Ở nhà", other: "✨ Khác",
};

const SLOT_TYPES = Object.keys(SLOT_LABEL);

function newSlotId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newCandidateId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type Props = {
  initial: ScheduledDate;
  templates: Template[];
  viewerId: string;
};

export function PlanShell({ initial, templates, viewerId }: Props) {
  const [date, setDate] = useState<ScheduledDate>(initial);
  const [saving, setSaving] = useState(false);

  // Realtime: subscribe to scheduled_date:{id} so partner updates appear without
  // refresh. Deferred from CP9. Re-fetches the row on any broadcast from another viewer.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    const channel = supabase.channel(`scheduled_date:${initial.id}`);
    channel
      .on("broadcast", { event: "update" }, async (msg) => {
        const payload = msg.payload as { by?: string } | undefined;
        if (payload?.by === viewerId) return;
        try {
          const res = await fetch(`/api/dates/scheduled/${initial.id}`, { cache: "no-store" });
          if (!res.ok) return;
          const { date: fresh } = await res.json();
          setDate(fresh);
        } catch { /* ignore */ }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initial.id, viewerId]);

  async function patch(body: Partial<ScheduledDate>): Promise<void> {
    setSaving(true);
    try {
      const res = await fetch(`/api/dates/scheduled/${date.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert("Lưu không được, thử lại nha"); return; }
      const { date: updated } = await res.json();
      setDate(updated);
    } finally {
      setSaving(false);
    }
  }

  if (!date.outline_snapshot) {
    return <TemplatePicker templates={templates} onPick={(slots) => patch({ outline_snapshot: slots })} saving={saving} />;
  }
  if (!date.itinerary) {
    return (
      <OutlineEditor
        date={date}
        viewerId={viewerId}
        onChange={(slots) => patch({ outline_snapshot: slots })}
        onSpin={async () => {
          if (saving) return;
          setSaving(true);
          try {
            const res = await fetch(`/api/dates/scheduled/${date.id}/spin`, { method: "POST" });
            if (!res.ok) { alert("Quay không được, thử lại nha"); return; }
            const { date: updated } = await res.json();
            setDate(updated);
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
      />
    );
  }
  return (
    <ItineraryView
      date={date}
      onReset={() => patch({ itinerary: null })}
      saving={saving}
    />
  );
}

// ── Phase 1: pick a template ───────────────────────────────────────────────

function TemplatePicker({
  templates,
  onPick,
  saving,
}: {
  templates: Template[];
  onPick: (slots: OutlineSlot[]) => void;
  saving: boolean;
}) {
  function pick(t: Template) {
    if (saving) return;
    const slots: OutlineSlot[] = t.slots.map((s) => ({
      id: newSlotId(),
      type: s.type,
      label_vi: s.label_vi,
      label_en: s.label_en,
      candidates: [],
    }));
    onPick(slots);
  }
  return (
    <div>
      <p className="section-eyebrow mb-3">Bắt đầu từ khung mẫu nào</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t)}
            disabled={saving}
            className="surface-card text-left p-4 transition-all hover:translate-y-[-1px] active:scale-[0.98]"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
              {t.label_vi}
            </p>
            {t.description_vi && (
              <p className="text-[12px] mt-1 line-clamp-2" style={{ color: "var(--color-ink-soft)" }}>
                {t.description_vi}
              </p>
            )}
            <p className="text-[11px] mt-2.5" style={{ color: "var(--color-accent)" }}>
              {t.slots.length} bước
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Phase 2: edit outline + fill candidates ────────────────────────────────

function OutlineEditor({
  date,
  viewerId,
  onChange,
  onSpin,
  saving,
}: {
  date: ScheduledDate;
  viewerId: string;
  onChange: (slots: OutlineSlot[]) => void;
  onSpin: () => void;
  saving: boolean;
}) {
  const slots = date.outline_snapshot ?? [];
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  useEffect(() => {
    fetch("/api/dates/ideas").then((r) => r.json()).then((d) => setIdeas(d.ideas ?? []));
  }, []);

  function setSlots(next: OutlineSlot[]) { onChange(next); }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    setSlots(next);
  }
  function removeSlot(i: number) {
    setSlots(slots.filter((_, k) => k !== i));
  }
  function addSlotAt(i: number, type: string) {
    const next = [...slots];
    next.splice(i + 1, 0, {
      id: newSlotId(),
      type,
      label_vi: SLOT_LABEL[type] ?? type,
      candidates: [],
    });
    setSlots(next);
  }
  function toggleIdeaCandidate(slotIndex: number, idea: DateIdea, on: boolean) {
    const next = [...slots];
    const s = next[slotIndex];
    if (on) {
      s.candidates = [
        ...s.candidates,
        {
          id: newCandidateId(),
          source: "date_idea",
          label_vi: idea.title || idea.url || idea.notes || "(idea)",
          date_idea_id: idea.id,
          used_count: idea.used_count,
          last_used_at: idea.last_used_at,
          addedBy: viewerId,
        },
      ];
    } else {
      s.candidates = s.candidates.filter((c) => c.date_idea_id !== idea.id);
    }
    setSlots(next);
  }
  function addCustom(slotIndex: number, label: string) {
    if (!label.trim()) return;
    const next = [...slots];
    next[slotIndex].candidates = [
      ...next[slotIndex].candidates,
      { id: newCandidateId(), source: "custom", label_vi: label.trim(), addedBy: viewerId },
    ];
    setSlots(next);
  }
  function removeCandidate(slotIndex: number, candId: string) {
    const next = [...slots];
    next[slotIndex].candidates = next[slotIndex].candidates.filter((c) => c.id !== candId);
    setSlots(next);
  }

  const totalCandidates = slots.reduce((a, s) => a + s.candidates.length, 0);
  const allHaveCandidates = slots.length > 0 && slots.every((s) => s.candidates.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="section-eyebrow">Các bước · {slots.length}</p>
        <p className="text-[11.5px]" style={{ color: "var(--color-ink-mute)" }}>
          {totalCandidates} ý tưởng
        </p>
      </div>

      <ol className="space-y-3">
        {slots.map((s, i) => (
          <li key={s.id}>
            <SlotCard
              slot={s}
              slotIndex={i}
              ideas={ideas.filter((it) => it.slot_type === s.type)}
              onMoveUp={i > 0 ? () => move(i, -1) : undefined}
              onMoveDown={i < slots.length - 1 ? () => move(i, 1) : undefined}
              onRemove={() => removeSlot(i)}
              onToggleIdea={(idea, on) => toggleIdeaCandidate(i, idea, on)}
              onAddCustom={(label) => addCustom(i, label)}
              onRemoveCandidate={(cid) => removeCandidate(i, cid)}
              onInsertAfter={(type) => addSlotAt(i, type)}
            />
          </li>
        ))}
      </ol>

      <AddSlotButton onAdd={(type) => addSlotAt(slots.length - 1, type)} />

      <div className="sticky bottom-4 pt-2">
        <button
          onClick={onSpin}
          disabled={saving || !allHaveCandidates}
          className="btn-primary w-full py-3.5 text-[15px]"
          style={
            !allHaveCandidates
              ? { background: "rgba(58,33,41,0.12)", color: "var(--color-ink-mute)", cursor: "not-allowed" }
              : undefined
          }
        >
          {saving ? "Đang quay…" : allHaveCandidates ? "Quay vòng 🎲" : "Mỗi bước cần ít nhất 1 ý tưởng"}
        </button>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  slotIndex,
  ideas,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleIdea,
  onAddCustom,
  onRemoveCandidate,
  onInsertAfter,
}: {
  slot: OutlineSlot;
  slotIndex: number;
  ideas: DateIdea[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  onToggleIdea: (idea: DateIdea, on: boolean) => void;
  onAddCustom: (label: string) => void;
  onRemoveCandidate: (cid: string) => void;
  onInsertAfter: (type: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [expanded, setExpanded] = useState(true);
  const pickedIdeaIds = new Set(slot.candidates.filter((c) => c.date_idea_id).map((c) => c.date_idea_id));

  return (
    <div className="surface-card p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-semibold"
          style={{ background: "var(--color-accent-tint)", color: "var(--color-accent)" }}
        >
          {slotIndex + 1}
        </span>
        <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          {SLOT_LABEL[slot.type] ?? slot.type}
        </span>
        <span className="text-[11.5px]" style={{ color: "var(--color-ink-mute)" }}>
          · {slot.label_vi}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {onMoveUp && <IconButton onClick={onMoveUp} label="Lên">↑</IconButton>}
          {onMoveDown && <IconButton onClick={onMoveDown} label="Xuống">↓</IconButton>}
          <IconButton onClick={onRemove} label="Xóa" danger>✕</IconButton>
        </div>
      </div>

      {slot.candidates.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2.5">
          {slot.candidates.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onRemoveCandidate(c.id)}
                className="chip chip-active gap-1"
                title="Bấm để xóa"
              >
                {c.label_vi}
                <span style={{ opacity: 0.7 }}>✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[11.5px] mb-2 transition-colors"
        style={{ color: "var(--color-accent)" }}
      >
        {expanded ? "Ẩn ý tưởng" : "Thêm ý tưởng"}
      </button>

      {expanded && (
        <div className="space-y-2.5">
          {ideas.length > 0 && (
            <div className="space-y-1">
              <p className="field-label" style={{ marginBottom: 4 }}>
                Từ kho ý tưởng
              </p>
              <ul className="space-y-1">
                {ideas.map((it) => (
                  <li key={it.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pickedIdeaIds.has(it.id)}
                        onChange={(e) => onToggleIdea(it, e.target.checked)}
                        className="w-4 h-4"
                        style={{ accentColor: "var(--color-accent)" }}
                      />
                      <span className="text-[12.5px] truncate" style={{ color: "var(--color-ink)" }}>
                        {it.title || it.url || it.notes || "(idea)"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="+ Tự thêm…"
              className="input-base flex-1"
              style={{ padding: "0.375rem 0.625rem", fontSize: "0.8125rem" }}
            />
            <button
              onClick={() => { onAddCustom(custom); setCustom(""); }}
              className="btn-ghost"
              style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem" }}
            >
              Thêm
            </button>
          </div>
        </div>
      )}

      <details className="mt-3 text-[11.5px]" style={{ color: "var(--color-ink-mute)" }}>
        <summary className="cursor-pointer">+ Chèn bước sau bước này</summary>
        <div className="flex flex-wrap gap-1 mt-2">
          {SLOT_TYPES.map((t) => (
            <button key={t} onClick={() => onInsertAfter(t)} className="chip">
              {SLOT_LABEL[t]}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function IconButton({
  onClick, children, label, danger = false,
}: { onClick: () => void; children: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-7 h-7 rounded-full text-[12px] flex items-center justify-center transition-colors hover:bg-[rgba(58,33,41,0.04)]"
      style={{
        border: "1px solid var(--color-hairline-strong)",
        color: danger ? "var(--color-accent)" : "var(--color-ink-soft)",
      }}
    >
      {children}
    </button>
  );
}

function AddSlotButton({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl text-[13px] font-medium transition-colors hover:bg-[rgba(58,33,41,0.02)]"
        style={{ border: "1px dashed var(--color-hairline-strong)", color: "var(--color-ink-soft)" }}
      >
        + Thêm bước
      </button>
    );
  }
  return (
    <div className="surface-card p-3.5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <p className="field-label">Chọn loại bước</p>
      <div className="flex flex-wrap gap-1.5">
        {SLOT_TYPES.map((t) => (
          <button key={t} onClick={() => { onAdd(t); setOpen(false); }} className="chip">
            {SLOT_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Phase 3: itinerary reveal + edit ────────────────────────────────────────

function ItineraryView({
  date,
  onReset,
  saving,
}: {
  date: ScheduledDate;
  onReset: () => void;
  saving: boolean;
}) {
  const itinerary = date.itinerary ?? [];
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    setRevealCount(0);
    const interval = window.setInterval(() => {
      setRevealCount((c) => (c >= itinerary.length ? c : c + 1));
    }, 450);
    return () => window.clearInterval(interval);
  }, [itinerary.length]);

  const allRevealed = revealCount >= itinerary.length;

  return (
    <div className="space-y-4">
      <div>
        <p className="section-eyebrow mb-1.5">Kết quả vòng quay</p>
        <h2 className="page-title">Kế hoạch hẹn 🎲</h2>
      </div>
      <ol className="space-y-2">
        {itinerary.map((it, i) => {
          if (i >= revealCount) {
            return (
              <li
                key={i}
                className="rounded-2xl p-4 animate-pulse text-[11.5px]"
                style={{ background: "rgba(58,33,41,0.04)", color: "var(--color-ink-mute)" }}
              >
                …
              </li>
            );
          }
          const slotEmoji = SLOT_LABEL[it.type ?? "other"] ?? "✨";
          return (
            <li key={i} className="surface-card p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
              <p className="field-label" style={{ marginBottom: 4 }}>
                {slotEmoji} · Bước {i + 1}
              </p>
              <p className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
                {it.pick?.label_vi ?? "(chưa có ý tưởng)"}
              </p>
              {it.manually_overridden && (
                <p className="text-[10.5px] mt-1" style={{ color: "var(--color-accent)" }}>
                  đã chọn tay
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {allRevealed && (
        <div className="flex gap-2">
          <button onClick={onReset} disabled={saving} className="btn-ghost flex-1 py-3">
            Quay lại 🎲
          </button>
        </div>
      )}
    </div>
  );
}
