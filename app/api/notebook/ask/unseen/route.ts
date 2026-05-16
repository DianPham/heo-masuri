/**
 * GET /api/notebook/ask/unseen
 * Returns the count of ask threads where Masuri has replied but Heo hasn't seen yet.
 * Used by BottomNav to show the 📓→💕 badge (Blueprint §14 G3).
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ count: 0 });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ count: 0 });

    const { count, error } = await supabase
      .from("ask_masuri_threads")
      .select("id", { count: "exact", head: true })
      .eq("from_user", heo.id)
      .not("reply_text", "is", null)
      .is("seen_at", null);

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ count: 0 });
      console.error("[ask/unseen]", error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
