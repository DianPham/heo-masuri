import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay } from "date-fns";

const TZ = "Asia/Ho_Chi_Minh";

export function nowInVN(): Date {
  return toZonedTime(new Date(), TZ);
}

export function startOfDayVN(date?: Date): Date {
  const d = toZonedTime(date ?? new Date(), TZ);
  return fromZonedTime(startOfDay(d), TZ);
}

export function endOfDayVN(date?: Date): Date {
  const d = toZonedTime(date ?? new Date(), TZ);
  return fromZonedTime(endOfDay(d), TZ);
}

export function daysUntil(targetDate: string): number {
  const now = toZonedTime(new Date(), TZ);
  const target = new Date(targetDate + "T00:00:00+07:00");
  const diffMs = target.getTime() - startOfDay(now).getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function progressPercent(createdAt: string, targetDate: string): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(targetDate + "T00:00:00+07:00").getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}
