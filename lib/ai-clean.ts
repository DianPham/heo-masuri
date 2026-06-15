/**
 * AI cleanup for fetched URL previews. Sends the raw caption + url to
 * DeepSeek's chat API and asks for a clean title / description / slot type
 * guess / tags. Used by /api/dates/preview when ?ai=1.
 *
 * Falls back gracefully:
 *  - no DEEPSEEK_API_KEY env → returns null
 *  - API down or 4xx → returns null
 *  - bad JSON in response → returns null
 *
 * Never throws; never blocks the underlying preview from being returned.
 */
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
const AI_TIMEOUT_MS = 8000;

export const SLOT_TYPES = [
  "eat", "drink", "activity", "walk", "movie", "drive", "home", "other",
] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export type AICleanResult = {
  title: string | null;
  description: string | null;
  slot_type: SlotType | null;
  tags: string[];
};

export type AICleanInput = {
  url: string;
  raw_title: string | null;
  raw_description: string | null;
};

const SYSTEM_PROMPT = `Bạn là trợ lý lên kế hoạch hẹn hò cho cặp đôi nói tiếng Việt. Người dùng vừa lưu một video/post TikTok làm ý tưởng hẹn. Đầu vào của bạn là caption gốc + URL. Trả về JSON sạch để hiện trên thẻ ý tưởng.

Quy tắc:
- "title": 5–8 từ tiếng Việt nắm bắt ý chính (tên quán, hoạt động, địa điểm). KHÔNG có hashtag, KHÔNG emoji thừa, không "@username".
- "description": 1 câu tiếng Việt ngắn gọn giải thích đây là gì + ở đâu (nếu caption nói). Tối đa 100 ký tự.
- "slot_type": chọn ĐÚNG MỘT trong các giá trị: "eat", "drink", "activity", "walk", "movie", "drive", "home", "other". Đoán theo nội dung. Nếu là quán ăn → "eat". Quán cà phê → "drink". Đi dạo / công viên → "walk". Phim → "movie". Hoạt động (concert, leo núi, vẽ tranh…) → "activity". Tour xe / lái xe ngắm cảnh → "drive". Việc trong nhà → "home". Không rõ → "other".
- "tags": 3–5 chuỗi ngắn, lowercase, dấu gạch nối, không dấu tiếng Việt. Ví dụ: ["indian", "saigon", "binh-thanh"].

Trả về CHỈ JSON, không bọc trong markdown, không lời dẫn.`;

export async function aiCleanPreview(input: AICleanInput): Promise<AICleanResult | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  // Skip cleanup entirely if the raw data is empty — nothing to refine.
  if (!input.raw_title && !input.raw_description) return null;

  const userMessage = JSON.stringify({
    url: input.url,
    raw_title: input.raw_title,
    raw_description: input.raw_description,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });
  } catch {
    clearTimeout(timeout);
    return null;
  }
  clearTimeout(timeout);

  if (!res.ok) return null;
  type DeepseekRes = {
    choices?: { message?: { content?: string } }[];
  };
  let body: DeepseekRes;
  try {
    body = (await res.json()) as DeepseekRes;
  } catch {
    return null;
  }
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 120) : null;
  const description =
    typeof obj.description === "string" ? obj.description.trim().slice(0, 200) : null;
  const slotRaw = typeof obj.slot_type === "string" ? obj.slot_type.toLowerCase() : null;
  const slot_type =
    slotRaw && (SLOT_TYPES as readonly string[]).includes(slotRaw)
      ? (slotRaw as SlotType)
      : null;
  const tags = Array.isArray(obj.tags)
    ? obj.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase().slice(0, 24))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return { title, description, slot_type, tags };
}
