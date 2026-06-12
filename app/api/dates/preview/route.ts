/**
 * GET /api/dates/preview?url=...
 * Server-side URL meta fetcher used by the date-ideas form. Blueprint §7.1.
 * See lib/url-preview.ts for sandboxing details.
 */
import { NextRequest, NextResponse } from "next/server";
import { getViewerUserId } from "@/lib/calendar";
import { fetchUrlPreview } from "@/lib/url-preview";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const preview = await fetchUrlPreview(url);
  return NextResponse.json(preview);
}
