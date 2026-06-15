const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type DiscordEmbed = {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
};

/**
 * Prefix the webhook display name with `[STAGING]` when ENVIRONMENT=staging,
 * so messages routed to the staging Discord category are visually unmistakable.
 * Production / unset → unchanged.
 *
 * Every Discord webhook post in this codebase must route its `username` field
 * through this helper. Phase 2 §3.3.
 */
export function webhookUsername(displayName: string): string {
  return process.env.ENVIRONMENT === "staging"
    ? `[STAGING] ${displayName}`
    : displayName;
}

type WebhookBody = {
  username?: string;
  content?: string;
  embeds?: DiscordEmbed[];
  [key: string]: unknown;
};

/**
 * Low-level webhook poster. Applies `webhookUsername()` automatically to the
 * `username` field if present. Callers should pass the raw display name.
 */
export async function sendWebhook(webhookUrl: string | undefined, body: WebhookBody) {
  if (!webhookUrl) {
    console.warn("[discord] Webhook URL not configured — skipping");
    return;
  }
  const finalBody: WebhookBody = {
    ...body,
    username: body.username ? webhookUsername(body.username) : undefined,
  };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalBody),
    });
    if (!res.ok) {
      console.error("[discord] Webhook failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[discord] Webhook error:", err);
  }
}

export async function notifyMissing(payload: {
  id: string;
  intensity: 1 | 2 | 3;
  countToday: number;
}) {
  const { id, intensity, countToday } = payload;
  const ackUrl = `${APP_URL}/m/ack/${id}`;

  const embed: DiscordEmbed = {
    title: intensity === 3 ? "💔 Heo nhớ Masuri lắm lắm" : "🐷 Heo nhớ Masuri",
    description: `Intensity: ${"❤️".repeat(intensity)}\nLần thứ ${countToday} hôm nay`,
    color: 0xf8b4c4,
    timestamp: new Date().toISOString(),
  };

  embed.description = (embed.description ?? "") + `\n\n[👉 Đã thấy 💕](${ackUrl})`;

  await sendWebhook(process.env.DISCORD_WEBHOOK_MISSING, {
    username: "Heo",
    embeds: [embed],
  });
}

const ANGRY_COLORS: Record<string, number> = {
  space:    0x7289da,
  presence: 0xf8b4c4,
  vent:     0x9b59b6,
  fix:      0xe67e22,
};

const ANGRY_GUIDANCE: Record<string, string> = {
  space:    "Lùi lại, đừng nhắn dồn. Cho Heo thời gian.",
  presence: "Gọi điện hoặc tới ngay nếu được.",
  vent:     "Heo cần được lắng nghe. Đừng sửa, đừng khuyên — chỉ cần ở đó.",
  fix:      "Hỏi cụ thể vấn đề là gì.",
};

const ANGRY_NEED_LABELS: Record<string, string> = {
  space:    "cần một chút không gian",
  presence: "cần Masuri ở đây",
  vent:     "cần được lắng nghe",
  fix:      "cần Masuri giúp sửa một chuyện",
};

export async function notifyAngry(payload: {
  id: string;
  needType: string;
  contextNote?: string | null;
}) {
  const { id, needType, contextNote } = payload;

  const baseUrl = `${APP_URL}/m/angry/${id}/reply`;
  const inAppUrl = `${APP_URL}/masuri/angry/${id}`;
  const fields = [
    { name: "Heo cần:", value: ANGRY_NEED_LABELS[needType] ?? needType },
    { name: "Gợi ý:", value: ANGRY_GUIDANCE[needType] ?? "" },
  ];
  if (contextNote) {
    fields.splice(1, 0, { name: "Heo nói:", value: contextNote });
  }

  const quickLinks = [
    `[Đã thấy](${baseUrl}/heard_you)`,
    `[Xin lỗi](${baseUrl}/sorry)`,
    `[Đang đến](${baseUrl}/on_my_way)`,
    `[10 phút nữa](${baseUrl}/talk_in_10)`,
  ].join(" · ");

  await sendWebhook(process.env.DISCORD_WEBHOOK_ANGRY, {
    username: "Heo",
    embeds: [
      {
        title: "💔 Heo đang không ổn",
        color: ANGRY_COLORS[needType] ?? 0xf8b4c4,
        fields,
        description: `[**Mở trong app →**](${inAppUrl})\n\n⚡ Trả lời nhanh: ${quickLinks}`,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function logEvent(message: string) {
  await sendWebhook(process.env.DISCORD_WEBHOOK_LOGS, {
    username: "H&M Logs",
    content: `\`${new Date().toISOString()}\` ${message}`,
  });
}
