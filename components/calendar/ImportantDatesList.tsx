"use client";

/**
 * ImportantDatesList — list view grouped by recurrence (one-time, monthly,
 * yearly), each section sorted by next-occurrence. Each item is tappable to
 * open an inline edit form. Future rows get a "Plan a date for this day"
 * shortcut to the date scheduler (§7.5).
 */
import { useMemo, useState } from "react";
import { DateSchedulerSheet } from "@/components/dates/DateSchedulerSheet";
import {
  type ImportantDate,
  type Occurrence,
  nextOccurrence,
  daysFromTodayVN,
  defaultRecurrenceFor,
  defaultEmojiFor,
  todayVN,
} from "@/lib/important-dates";

type FormState = Omit<ImportantDate, "id" | "created_at" | "is_current">;

const KIND_LABEL_VI: Record<ImportantDate["kind"], string> = {
  reunion: "Đoàn tụ",
  anniversary: "Kỷ niệm",
  monthiversary: "Kỷ niệm tháng",
  birthday_heo: "Sinh nhật Heo",
  birthday_masuri: "Sinh nhật Masuri",
  other: "Khác",
};

function emptyForm(): FormState {
  return {
    label_vi: "",
    label_en: "",
    target_date: todayVN(),
    kind: "other",
    recurrence: "none",
    emoji: null,
    show_on_home: true,
  };
}

export function ImportantDatesList({ initial }: { initial: ImportantDate[] }) {
  const [dates, setDates] = useState<ImportantDate[]>(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  // { occ: YYYY-MM-DD VN } → opens the scheduler sheet with that day's 19:00 prefill.
  const [schedulingFor, setSchedulingFor] = useState<{ occ: string; label: string } | null>(null);

  const groups = useMemo(() => {
    const today = todayVN();
    function annotate(d: ImportantDate): Occurrence | null {
      const n = nextOccurrence(d, today);
      return n ? { importantDate: d, date: n } : null;
    }
    const monthly = dates.filter((d) => d.recurrence === "monthly").map(annotate).filter(Boolean) as Occurrence[];
    const yearly = dates.filter((d) => d.recurrence === "yearly").map(annotate).filter(Boolean) as Occurrence[];
    const once = dates.filter((d) => d.recurrence === "none").map(annotate).filter(Boolean) as Occurrence[];
    const bySoon = (a: Occurrence, b: Occurrence) => a.date.localeCompare(b.date);
    return {
      once: once.sort(bySoon),
      monthly: monthly.sort(bySoon),
      yearly: yearly.sort(bySoon),
    };
  }, [dates]);

  return (
    <div>
      {editing === "new" ? (
        <DateForm
          initial={emptyForm()}
          onCancel={() => setEditing(null)}
          onSave={async (values) => {
            const res = await fetch("/api/important-dates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            });
            if (!res.ok) { alert("Lưu không được, thử lại nha"); return false; }
            const { date } = await res.json();
            setDates((prev) => [date, ...prev]);
            setEditing(null);
            return true;
          }}
        />
      ) : (
        <button onClick={() => setEditing("new")} className="btn-primary w-full mb-5 py-3">
          + Thêm ngày đặc biệt
        </button>
      )}

      <Section title="Sắp tới" items={groups.once} {...{ editing, setEditing, dates, setDates, setSchedulingFor }} />
      <Section title="Hàng tháng" items={groups.monthly} {...{ editing, setEditing, dates, setDates, setSchedulingFor }} />
      <Section title="Hàng năm" items={groups.yearly} {...{ editing, setEditing, dates, setDates, setSchedulingFor }} />

      {dates.length === 0 && (
        <div
          className="text-center py-10 px-6 rounded-2xl"
          style={{ border: "1px dashed var(--color-hairline-strong)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Chưa có ngày nào.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-ink-mute)" }}>
            Thêm sinh nhật, kỷ niệm ở trên ↑
          </p>
        </div>
      )}

      {schedulingFor && (
        <DateSchedulerSheet
          // Prefill 19:00 VN on the picked occurrence; the scheduler form
          // shifts end by the same delta if start changes.
          defaultStart={new Date(`${schedulingFor.occ}T19:00:00+07:00`).toISOString()}
          defaultEnd={new Date(`${schedulingFor.occ}T21:00:00+07:00`).toISOString()}
          defaultTitle={schedulingFor.label}
          onClose={() => setSchedulingFor(null)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  items,
  editing,
  setEditing,
  dates,
  setDates,
  setSchedulingFor,
}: {
  title: string;
  items: Occurrence[];
  editing: string | "new" | null;
  setEditing: (s: string | "new" | null) => void;
  dates: ImportantDate[];
  setDates: React.Dispatch<React.SetStateAction<ImportantDate[]>>;
  setSchedulingFor: (v: { occ: string; label: string } | null) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="section-eyebrow mb-2.5 px-1">{title}</h2>
      <ul className="space-y-2">
        {items.map(({ importantDate: d, date: occ }) => (
          <li key={d.id}>
            {editing === d.id ? (
              <DateForm
                initial={{
                  label_vi: d.label_vi,
                  label_en: d.label_en,
                  target_date: d.target_date,
                  kind: d.kind,
                  recurrence: d.recurrence,
                  emoji: d.emoji,
                  show_on_home: d.show_on_home,
                }}
                onCancel={() => setEditing(null)}
                onDelete={async () => {
                  if (!confirm("Xóa ngày này nha?")) return;
                  await fetch(`/api/important-dates/${d.id}`, { method: "DELETE" });
                  setDates(dates.filter((x) => x.id !== d.id));
                  setEditing(null);
                }}
                onSave={async (values) => {
                  const res = await fetch(`/api/important-dates/${d.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                  });
                  if (!res.ok) { alert("Lưu không được, thử lại nha"); return false; }
                  const { date } = await res.json();
                  setDates((prev) => prev.map((x) => (x.id === d.id ? date : x)));
                  setEditing(null);
                  return true;
                }}
              />
            ) : (
              <Row
                d={d}
                occ={occ}
                onClick={() => setEditing(d.id)}
                onPlan={() => setSchedulingFor({ occ, label: d.label_vi })}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({
  d,
  occ,
  onClick,
  onPlan,
}: {
  d: ImportantDate;
  occ: string;
  onClick: () => void;
  onPlan: () => void;
}) {
  const days = daysFromTodayVN(occ);
  const dayLabel = days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `${days} ngày nữa`;
  const isToday = days === 0;
  return (
    <div className="surface-card overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-[rgba(58,33,41,0.02)]"
      >
        <span
          className="text-xl grid place-items-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{ background: isToday ? "var(--color-accent-tint)" : "rgba(58,33,41,0.04)" }}
          aria-hidden
        >
          {d.emoji ?? "⭐"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold tracking-tight truncate" style={{ color: "var(--color-ink)" }}>
            {d.label_vi}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-mute)" }}>
            {occ} · {KIND_LABEL_VI[d.kind]}
          </p>
        </div>
        <span
          className="text-[11.5px] font-semibold whitespace-nowrap"
          style={{ color: isToday ? "var(--color-accent)" : "var(--color-ink-mute)" }}
        >
          {dayLabel}
        </span>
      </button>
      {days >= 0 && (
        <button
          type="button"
          onClick={onPlan}
          className="hairline-t w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[rgba(58,33,41,0.02)]"
          style={{ color: "var(--color-accent)" }}
        >
          + Lên kế hoạch hẹn cho ngày này
        </button>
      )}
    </div>
  );
}

function DateForm({
  initial,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: FormState;
  onCancel: () => void;
  onSave: (values: FormState) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const [labelVi, setLabelVi] = useState(initial.label_vi);
  const [labelEn, setLabelEn] = useState(initial.label_en);
  const [targetDate, setTargetDate] = useState(initial.target_date);
  const [kind, setKind] = useState<ImportantDate["kind"]>(initial.kind);
  const [recurrence, setRecurrence] = useState<ImportantDate["recurrence"]>(initial.recurrence);
  const [emoji, setEmoji] = useState(initial.emoji ?? "");
  const [showOnHome, setShowOnHome] = useState(initial.show_on_home);
  const [saving, setSaving] = useState(false);

  function handleKindChange(k: ImportantDate["kind"]) {
    const prevDefault = defaultEmojiFor(kind);
    setKind(k);
    // Auto-defaults per blueprint §6.7. Overwrite the emoji either when blank
    // OR when it still matches the previous kind's default — that way the user
    // can switch kinds and not be stuck with a stale heart on a birthday.
    setRecurrence(defaultRecurrenceFor(k));
    if (!emoji.trim() || emoji.trim() === prevDefault) setEmoji(defaultEmojiFor(k));
  }

  async function handleSave() {
    if (saving) return;
    if (!labelVi.trim() || !labelEn.trim()) {
      alert("Nhớ điền cả tiếng Việt và tiếng Anh nha");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        label_vi: labelVi.trim(),
        label_en: labelEn.trim(),
        target_date: targetDate,
        kind,
        recurrence,
        emoji: emoji.trim() || null,
        show_on_home: showOnHome,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface-card p-5 space-y-3.5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <FieldText label="Tên (tiếng Việt)" value={labelVi} onChange={setLabelVi} placeholder="Ngày yêu nhau" />
      <FieldText label="Tên (English)" value={labelEn} onChange={setLabelEn} placeholder="Anniversary" />
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="Ngày" value={targetDate} onChange={setTargetDate} type="date" />
        <div>
          <label className="field-label">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 16))}
            className="input-base text-center"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Loại</label>
          <select
            value={kind}
            onChange={(e) => handleKindChange(e.target.value as ImportantDate["kind"])}
            className="input-base bg-white"
          >
            <option value="reunion">Đoàn tụ</option>
            <option value="anniversary">Kỷ niệm</option>
            <option value="monthiversary">Kỷ niệm tháng</option>
            <option value="birthday_heo">Sinh nhật Heo</option>
            <option value="birthday_masuri">Sinh nhật Masuri</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <div>
          <label className="field-label">Lặp lại</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as ImportantDate["recurrence"])}
            className="input-base bg-white"
          >
            <option value="none">Không</option>
            <option value="monthly">Hàng tháng</option>
            <option value="yearly">Hàng năm</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showOnHome}
          onChange={(e) => setShowOnHome(e.target.checked)}
          className="w-4 h-4"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <span className="text-[13px]" style={{ color: "var(--color-ink)" }}>
          Hiện thẻ nhắc trên trang chính
        </span>
      </label>
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button onClick={onCancel} className="btn-ghost">
          Hủy
        </button>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="w-full text-[11.5px] py-1"
          style={{ color: "var(--color-ink-mute)" }}
        >
          Xóa ngày này khỏi danh sách
        </button>
      )}
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base"
      />
    </div>
  );
}
