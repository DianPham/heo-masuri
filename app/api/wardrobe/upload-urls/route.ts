/**
 * POST /api/wardrobe/upload-urls
 *
 * Mints two signed UPLOAD URLs for a new wardrobe item: one for the
 * full-size photo, one for the 200x200 thumbnail. The client uploads
 * directly to Supabase Storage, then POSTs /api/wardrobe/items with the
 * resulting paths.
 *
 * Path scheme:  <viewer_id>/<uuid>/photo.<ext>  &  …/thumb.<ext>
 *
 * Body: { ext?: "jpg"|"jpeg"|"png"|"webp" }   (defaults to jpg)
 * Returns: { id, photo: { path, uploadUrl, token }, thumb: { path, uploadUrl, token } }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const extIn = typeof body.ext === "string" ? body.ext.toLowerCase() : "jpg";
  if (!ALLOWED_EXTS.has(extIn)) {
    return NextResponse.json({ error: "ext must be jpg/jpeg/png/webp" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const photoPath = `${viewerId}/${id}/photo.${extIn}`;
  const thumbPath = `${viewerId}/${id}/thumb.${extIn}`;

  const supabase = createServerClient();
  const [{ data: photo, error: pe }, { data: thumb, error: te }] = await Promise.all([
    supabase.storage.from("wardrobe").createSignedUploadUrl(photoPath),
    supabase.storage.from("wardrobe").createSignedUploadUrl(thumbPath),
  ]);
  if (pe || te || !photo || !thumb) {
    console.error("[wardrobe upload-urls]", pe, te);
    return NextResponse.json({ error: "could not mint upload urls" }, { status: 500 });
  }
  return NextResponse.json({
    id,
    photo: { path: photo.path, uploadUrl: photo.signedUrl, token: photo.token },
    thumb: { path: thumb.path, uploadUrl: thumb.signedUrl, token: thumb.token },
  });
}
