/**
 * POST /api/notebook/page/complete
 * Called when Heo reaches the CompletionCard — marks the page as completed.
 * Idempotent: if already completed, returns current value unchanged.
 *
 * Body: { page_id: string }
 * Cookie: who=heo  (session guard)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
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

    // Read current state
    const { data: page } = await supabase
      .from("daily_pages")
      .select("id, completed_at, for_user")
      .eq("id", page_id)
      .eq("for_user", heo.id)
      .maybeSingle();

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Already completed — idempotent
    if (page.completed_at) {
      return NextResponse.json({ completed_at: page.completed_at, already_done: true });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("daily_pages")
      .update({ completed_at: now })
      .eq("id", page_id);

    if (error) {
      console.error("[page/complete]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/heo/notebook");
    revalidatePath("/heo/notebook/scrapbook");
    revalidatePath("/masuri/notebook/progress");

    return NextResponse.json({ completed_at: now, already_done: false });
  } catch (err) {
    console.error("[page/complete]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
