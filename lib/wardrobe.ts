/**
 * Wardrobe helpers — signed-URL refresh + viewable shape.
 *
 * The DB stores STORAGE PATHS (e.g. "01fe…/abcd/photo.jpg") in photo_url +
 * thumbnail_url. The API layer converts those to fresh 24h signed URLs on
 * every read (per blueprint §17 — private bucket, signed URLs for reads).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type WardrobeItemRow = {
  id: string;
  owner: string;
  photo_url: string;            // stored as storage path
  thumbnail_url: string | null; // stored as storage path
  label: string | null;
  tags: string[];
  added_at: string | null;
  archived: boolean;
  wear_count: number;
  last_worn_at: string | null;
};

export type VisibleWardrobeItem = WardrobeItemRow & {
  /** Signed read URL for the original photo, 24h expiry. */
  photo_signed_url: string | null;
  /** Signed read URL for the thumbnail, 24h expiry. Falls back to photo_url. */
  thumbnail_signed_url: string | null;
};

const SIGN_TTL_SECONDS = 60 * 60 * 24;

export async function signWardrobeItem(
  supabase: SupabaseClient,
  row: WardrobeItemRow
): Promise<VisibleWardrobeItem> {
  const paths = [row.photo_url, row.thumbnail_url].filter((p): p is string => !!p);
  const { data } = paths.length
    ? await supabase.storage.from("wardrobe").createSignedUrls(paths, SIGN_TTL_SECONDS)
    : { data: [] };
  const byPath: Record<string, string | null> = {};
  for (const entry of data ?? []) {
    if (entry.path) byPath[entry.path] = entry.signedUrl ?? null;
  }
  return {
    ...row,
    photo_signed_url: byPath[row.photo_url] ?? null,
    thumbnail_signed_url: row.thumbnail_url
      ? byPath[row.thumbnail_url] ?? byPath[row.photo_url] ?? null
      : byPath[row.photo_url] ?? null,
  };
}

export async function signWardrobeItems(
  supabase: SupabaseClient,
  rows: WardrobeItemRow[]
): Promise<VisibleWardrobeItem[]> {
  if (rows.length === 0) return [];
  const allPaths: string[] = [];
  for (const r of rows) {
    allPaths.push(r.photo_url);
    if (r.thumbnail_url) allPaths.push(r.thumbnail_url);
  }
  const { data } = await supabase.storage
    .from("wardrobe")
    .createSignedUrls(allPaths, SIGN_TTL_SECONDS);
  const byPath: Record<string, string | null> = {};
  for (const entry of data ?? []) {
    if (entry.path) byPath[entry.path] = entry.signedUrl ?? null;
  }
  return rows.map((r) => ({
    ...r,
    photo_signed_url: byPath[r.photo_url] ?? null,
    thumbnail_signed_url: r.thumbnail_url
      ? byPath[r.thumbnail_url] ?? byPath[r.photo_url] ?? null
      : byPath[r.photo_url] ?? null,
  }));
}
