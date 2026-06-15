#!/usr/bin/env npx tsx
/**
 * notify_masuri.ts
 * ─────────────────────────────────────────────────────────────
 * Sends a Discord webhook ping to #notebook-review so Masuri
 * knows a new draft page is ready for approval.
 * Also fires a Web Push notification if Masuri has a push sub.
 *
 * Usage:
 *   npx tsx scripts/routine/notify_masuri.ts --page-id <uuid>
 *
 * Requires env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   DISCORD_WEBHOOK_NOTEBOOK_REVIEW, NEXT_PUBLIC_APP_URL
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { sendWebhook } from "@/lib/discord";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const pageIdIndex = process.argv.indexOf("--page-id");
  const pageId = pageIdIndex !== -1 ? process.argv[pageIdIndex + 1] : null;

  if (!pageId) {
    console.error("Usage: notify_masuri.ts --page-id <uuid>");
    process.exit(1);
  }

  // Fetch page details
  const { data: page, error } = await supabase
    .from("daily_pages")
    .select("id, title_vi, title_en, topic, difficulty, cards, scheduled_for, generation_meta")
    .eq("id", pageId)
    .single();

  if (error || !page) {
    console.error("Page not found:", error?.message);
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app";
  const approveUrl = `${appUrl}/m/notebook/approve/${pageId}`;
  const cards = Array.isArray(page.cards) ? page.cards : [];
  const meta = page.generation_meta as Record<string, unknown> | null;
  const newVocab: string[] = Array.isArray(meta?.new_vocab) ? meta.new_vocab as string[] : [];
  const wordCards = cards.filter((c: Record<string, unknown>) => c.type === "word");

  // ── Discord webhook ───────────────────────────────────────
  {
    const payload = {
      username: "Sổ tiếng Anh",
      embeds: [
        {
          title: "📓 Trang ngày mai sẵn sàng",
          description:
            `**${page.title_vi}** / ${page.title_en}\n` +
            `Topic: \`${page.topic}\` • Độ khó: ${page.difficulty}/3\n` +
            `${cards.length} thẻ • ${wordCards.length} từ mới` +
            (newVocab.length > 0 ? `: _${newVocab.join(", ")}_` : ""),
          color: 0xf8b4c4,
          fields: [
            {
              name: "Ngày",
              value: page.scheduled_for,
              inline: true,
            },
          ],
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Duyệt nhanh 👀",
              url: approveUrl,
            },
          ],
        },
      ],
    };

    await sendWebhook(process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW, payload);
  }

  // ── Web Push to Masuri ────────────────────────────────────
  // Call the app's push API rather than duplicating VAPID logic here
  const pushUrl = `${appUrl}/api/notebook/admin/notify-masuri-push`;
  try {
    await fetch(pushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
      },
      body: JSON.stringify({ page_id: pageId, title_vi: page.title_vi }),
    });
  } catch {
    // Non-fatal — Discord is the primary channel
  }

  console.log(JSON.stringify({ ok: true, page_id: pageId, approve_url: approveUrl }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
