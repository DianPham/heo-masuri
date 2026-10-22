/**
 * POST /api/notebook/page/complete
 * Called when Heo reaches the CompletionCard — marks the page's track as completed.
 * Idempotent per language: if that track is already completed, returns it unchanged.
 *
 * Sets completed_{lang}_at, and completed_at on the first completion in any
 * language (completed_at drives streak, carry-over, scrapbook and publish-due).
 *
 * Body: { page_id: string, lang?: "en" | "zh" }   (lang defaults to "en")
 * Cookie: who=heo  (session guard)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { LANG_META, parseLang } from "@/lib/notebook/lesson";
import { sendPushToUser } from "@/lib/push";
import { sendWebhook } from "@/lib/discord";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const page_id = body.page_id as string | undefined;
    const lang = parseLang(body.lang) ?? "en";
    const langCol = lang === "zh" ? "completed_zh_at" : "completed_en_at";
    if (!page_id) {
      return NextResponse.json({ error: "page_id required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify the page belongs to Heo
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Read current state (also grab title + topic for Masuri notification)
    const { data: page } = await supabase
      .from("daily_pages")
      .select("id, completed_at, completed_en_at, completed_zh_at, for_user, title_vi, topic")
      .eq("id", page_id)
      .eq("for_user", heo.id)
      .maybeSingle();

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // This language already completed — idempotent
    const langDoneAt = (page as Record<string, unknown>)[langCol] as string | null;
    if (langDoneAt) {
      return NextResponse.json({ completed_at: langDoneAt, lang, already_done: true });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("daily_pages")
      .update({ [langCol]: now, completed_at: page.completed_at ?? now })
      .eq("id", page_id);

    if (error) {
      console.error("[page/complete]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/heo/notebook");
    revalidatePath("/heo/notebook/scrapbook");
    revalidatePath("/masuri/notebook");
    revalidatePath("/masuri/notebook/progress");

    // Notify Masuri that Heo finished her lesson
    const { data: masuri } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "masuri")
      .single();

    if (masuri) {
      const title = (page as Record<string, unknown>).title_vi as string | null;
      const langNote = `${LANG_META[lang].flag} ${LANG_META[lang].name_vi}`;

      await sendPushToUser(masuri.id, {
        title: "Heo vừa hoàn thành bài học! 🎉",
        body: title
          ? `"${title}" (${langNote}) — Heo học xong rồi 🌸`
          : `Heo học xong bài ${LANG_META[lang].name_vi} rồi 🌸`,
        url: `/masuri/notebook`,
        tag: "heo-completed",
      });

      // Discord webhook
      if (title) {
        await sendWebhook(process.env.DISCORD_WEBHOOK_LOGS, {
          username: "Sổ tiếng Anh",
          embeds: [{
            title: "🎉 Heo hoàn thành bài học!",
            description: `**${title}** (${langNote}) — Heo vừa học xong 🌸`,
            color: 0xa8d5a2,
          }],
        });
      }
    }

    return NextResponse.json({ completed_at: now, lang, already_done: false });
  } catch (err) {
    console.error("[page/complete]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
