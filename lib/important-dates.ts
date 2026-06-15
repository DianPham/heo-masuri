/**
 * Important-dates helpers. Blueprint §6.8.
 *
 * Stored shape: a single `target_date` plus `recurrence` ∈ {none, yearly, monthly}.
 * Occurrences are computed on the fly so the table stays compact.
 */

export type ImportantDate = {
  id: string;
  label_vi: string;
  label_en: string;
  target_date: string;        // YYYY-MM-DD
  kind: "reunion" | "anniversary" | "monthiversary" | "birthday_heo" | "birthday_masuri" | "other";
  recurrence: "none" | "yearly" | "monthly";
  is_current: boolean;
  emoji: string | null;
  show_on_home: boolean;
  created_at: string | null;
};

export type Occurrence = {
  importantDate: ImportantDate;
  date: string;               // YYYY-MM-DD, the actual occurrence
};

const DAY_MS = 86_400_000;

/** Pad to YYYY-MM-DD. */
function ymd(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

/** Days in a given month (1..12). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Today as YYYY-MM-DD in VN. */
export function todayVN(): string {
  const nowVn = new Date(Date.now() + 7 * 3_600_000);
  return ymd(nowVn.getUTCFullYear(), nowVn.getUTCMonth() + 1, nowVn.getUTCDate());
}

/** Compute occurrences of `id` that fall in [fromYmd, toYmd] inclusive. */
export function occurrencesInRange(
  id: ImportantDate,
  fromYmd: string,
  toYmd: string
): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  const [oy, om, od] = id.target_date.split("-").map(Number);

  if (id.recurrence === "none") {
    const ms = Date.UTC(oy, om - 1, od);
    if (ms >= fromMs && ms <= toMs) out.push(id.target_date);
    return out;
  }
  if (id.recurrence === "yearly") {
    for (let y = fy; y <= ty; y++) {
      // Handle Feb 29 → Feb 28 fallback in non-leap years.
      const dim = daysInMonth(y, om);
      const d = Math.min(od, dim);
      const ms = Date.UTC(y, om - 1, d);
      if (ms >= fromMs && ms <= toMs) out.push(ymd(y, om, d));
    }
    return out;
  }
  if (id.recurrence === "monthly") {
    // Walk month-by-month from from to to.
    let y = fy;
    let m = fm;
    while (y < ty || (y === ty && m <= tm)) {
      const dim = daysInMonth(y, m);
      const d = Math.min(od, dim);
      const ms = Date.UTC(y, m - 1, d);
      if (ms >= fromMs && ms <= toMs) out.push(ymd(y, m, d));
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return out;
  }
  return out;
}

/** Compute the next occurrence ≥ fromYmd (or null if there is none). */
export function nextOccurrence(id: ImportantDate, fromYmd: string): string | null {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const [oy, om, od] = id.target_date.split("-").map(Number);

  if (id.recurrence === "none") {
    const ms = Date.UTC(oy, om - 1, od);
    return ms >= fromMs ? id.target_date : null;
  }
  if (id.recurrence === "yearly") {
    for (let y = fy; y <= fy + 5; y++) {
      const dim = daysInMonth(y, om);
      const d = Math.min(od, dim);
      const ms = Date.UTC(y, om - 1, d);
      if (ms >= fromMs) return ymd(y, om, d);
    }
    return null;
  }
  if (id.recurrence === "monthly") {
    let y = fy;
    let m = fm;
    for (let i = 0; i < 60; i++) {
      const dim = daysInMonth(y, m);
      const d = Math.min(od, dim);
      const ms = Date.UTC(y, m - 1, d);
      if (ms >= fromMs) return ymd(y, m, d);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return null;
  }
  return null;
}

/** Days from todayVN() to a YYYY-MM-DD. Negative if past. */
export function daysFromTodayVN(target: string): number {
  const today = todayVN();
  const [ty, tm, td] = today.split("-").map(Number);
  const [oy, om, od] = target.split("-").map(Number);
  return Math.round((Date.UTC(oy, om - 1, od) - Date.UTC(ty, tm - 1, td)) / DAY_MS);
}

/** Defaults per blueprint §6.7. */
export function defaultRecurrenceFor(
  kind: ImportantDate["kind"]
): ImportantDate["recurrence"] {
  if (kind === "anniversary" || kind === "birthday_heo" || kind === "birthday_masuri") return "yearly";
  if (kind === "monthiversary") return "monthly";
  return "none";
}

export function defaultEmojiFor(kind: ImportantDate["kind"]): string {
  switch (kind) {
    case "reunion": return "💕";
    case "anniversary": return "💐";
    case "monthiversary": return "💕";
    case "birthday_heo": return "🎂";
    case "birthday_masuri": return "🎂";
    default: return "⭐";
  }
}
