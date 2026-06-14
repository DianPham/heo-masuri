/**
 * GET /api/dates/preview?url=...[&ai=1]
 *
 * Server-side URL meta fetcher used by the date-ideas form. Blueprint §7.1.
 * When ai=1 is set, runs the raw caption through DeepSeek to clean up the
 * title, generate a one-sentence VI description, guess a slot_type, and
 * suggest tags. AI cleanup is best-effort — falls back silently when the
 * DEEPSEEK_API_KEY env var isn't set or the call fails.
 */
import { NextRequest, NextResponse } from "next/server";
import { getViewerUserId } from "@/lib/calendar";
import { fetchUrlPreview } from "@/lib/url-preview";
import { aiCleanPreview, type AICleanResult } from "@/lib/ai-clean";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const preview = await fetchUrlPreview(url);

  let ai: AICleanResult | null = null;
  if (req.nextUrl.searchParams.get("ai") === "1") {
    ai = await aiCleanPreview({
      url: preview.canonical_url ?? url,
      raw_title: preview.title,
      raw_description: preview.description,
    });
  }

  return NextResponse.json({ ...preview, ai });
}
