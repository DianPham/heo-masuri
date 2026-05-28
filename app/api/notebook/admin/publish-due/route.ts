/**
 * GET/POST /api/notebook/admin/publish-due
 * Vercel Cron — runs daily at 06:00 Asia/Ho_Chi_Minh (23:00 UTC).
 * Vercel sends GET; manual triggers can use either.
 *
 * Publishes the SINGLE OLDEST queued lesson (approved or stale draft).
 * One lesson per day — keeps Heo's pace steady regardless of queue depth.
 * Fires a Discord alert if a draft is auto-published without Masuri's approval.
 *
 * Secured by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

async function handle(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const today = todayVN();
  const now = new Date().toISOString();

  // ── Unfinished lesson gate ────────────────────────────────────────────
  // If Heo has an active published lesson from the past 7 days that she
  // hasn't completed yet, don't publish a new one — let her finish first.
  // The 7-day window prevents old seed data from blocking forever.
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { data: unfinished } = await supabase
    .from("daily_pages")
    .select("id, scheduled_for, title_vi")
    .eq("status", "published")
    .is("completed_at", null)
    .gte("scheduled_for", sevenDaysAgo)
    .lt("scheduled_for", today)
    .limit(1)
    .maybeSingle();

  if (unfinished) {
    return NextResponse.json({
      published: 0,
      note: `Skipped — Heo has an unfinished lesson from ${unfinished.scheduled_for}: "${unfinished.title_vi}". Complete it first.`,
    });
  }

  // ── Find the SINGLE OLDEST queued lesson ──────────────────────────────
  // Publishing is decoupled from the calendar — oldest approved/draft first,
  // one per day. This prevents flooding Heo when the queue has multiple
  // items and ensures lessons are consumed in the order Masuri intended.
  const { data: due, error } = await supabase
    .from("daily_pages")
    .select("id, title_vi, status, for_user, scheduled_for")
    .in("status", ["approved", "draft"])
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[publish-due]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ published: 0, note: "No queued lessons" });
  }

  const published: string[] = [];
  const unapproved: string[] = [];
  const page = due[0];

  const { error: pubErr } = await supabase
    .from("daily_pages")
    .update({ status: "published", published_at: now })
    .eq("id", page.id);

  if (pubErr) {
    console.error("[publish-due] update failed", pubErr);
    return NextResponse.json({ error: pubErr.message }, { status: 500 });
  }

  published.push(page.id);
  if (page.status === "draft") {
    unapproved.push(page.title_vi);
  }

  // Alert if any draft was auto-published without approval
  if (unapproved.length > 0) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Sổ tiếng Anh",
          embeds: [
            {
              title: "⚠️ Trang tự động xuất bản chưa duyệt",
              description:
                `Các trang sau đã được xuất bản tự động lúc 6am mà Masuri chưa duyệt:\n` +
                unapproved.map((t) => `• ${t}`).join("\n") +
                `\n\nKiểm tra và sửa ngay nếu cần nha.`,
              color: 0xff9999,
            },
          ],
        }),
      }).catch(() => {});
    }
  }

  // Also send the daily reminder push to Heo (she just got a new page)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl && published.length > 0) {
    const REMINDER_COPIES = [
      "Trang sổ mới đến rồi 📬 5 phút thôi nha",
      "Pig đang đợi Heo nè 🐷✨",
      "Hôm nay học gì mới? Mở sổ ra coi 📓",
      "Heo ơi, sổ đang mở chờ Heo 💕",
    ];
    const body = REMINDER_COPIES[Math.floor(Math.random() * REMINDER_COPIES.length)];

    await fetch(`${appUrl}/api/notebook/admin/notify-heo-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
      },
      body: JSON.stringify({
        title: "Trang hôm nay đã sẵn sàng 📓",
        body,
        url: `${appUrl}/heo/notebook/today`,
        tag: "daily-page",
      }),
    }).catch(() => {});
  }

  if (published.length > 0) {
    revalidatePath("/heo/notebook/today");
    revalidatePath("/heo/notebook");
    revalidatePath("/masuri/notebook");
  }

  return NextResponse.json({ published: published.length, unapproved: unapproved.length });
}

// Vercel Cron sends GET; manual triggers may use POST.
export const GET = handle;
export const POST = handle;
