/**
 * Calendar helpers. Blueprint §6.2 (visibility filter).
 */
import { cookies } from "next/headers";
import { createTypedServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CalendarEventRow = Tables<"calendar_events">;

/** Public-facing event shape — what the API actually returns to the client. */
export type VisibleEvent = {
  id: string;
  owner: string;
  start_at: string;
  end_at: string;
  source: string;
  title: string | null;
  note: string | null;
  emoji: string | null;
  share_details: boolean;
  /** True when the viewer is the owner — drives editability in the UI. */
  is_own: boolean;
};

/**
 * Apply the privacy filter for a viewer. Owner sees everything. Partner sees
 * the time range only (title/note/emoji nulled) unless the row opted in.
 *
 * RATIONALE (§6.2): Doing this client-side would put private data on the wire
 * and inspectable in DevTools. Strip server-side, period.
 */
export function transformForViewer(
  event: CalendarEventRow,
  viewerId: string
): VisibleEvent {
  const isOwn = event.owner === viewerId;
  if (isOwn || event.share_details) {
    return {
      id: event.id,
      owner: event.owner,
      start_at: event.start_at,
      end_at: event.end_at,
      source: event.source,
      title: event.title,
      note: event.note,
      emoji: event.emoji,
      share_details: event.share_details,
      is_own: isOwn,
    };
  }
  return {
    id: event.id,
    owner: event.owner,
    start_at: event.start_at,
    end_at: event.end_at,
    source: event.source,
    title: null,
    note: null,
    emoji: null,
    share_details: false,
    is_own: false,
  };
}

/**
 * Resolve the current viewer's user id from the soft-gate cookie. Returns
 * null when no cookie is present (middleware will already have redirected
 * unauthenticated requests, but defensive null-return here keeps API routes
 * safe to call directly).
 */
export async function getViewerUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "heo" && who !== "masuri") return null;

  const supabase = createTypedServerClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("slug", who)
    .single();
  return data?.id ?? null;
}
