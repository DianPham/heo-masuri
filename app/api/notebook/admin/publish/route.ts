/**
 * POST /api/notebook/admin/publish
 * Masuri manually publishes a specific draft/approved page.
 * Body: { page_id: string }
 * Cookie: who=masuri
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "masuri") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const page_id = body.page_id as string | undefined;
    if (!page_id) {
      return NextResponse.json({ error: "page_id required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: page } = await supabase
      .from("daily_pages")
      .select("id, status, title_vi, scheduled_for")
      .eq("id", page_id)
      .in("status", ["draft", "approved"])
      .maybeSingle();

    if (!page) {
      return NextResponse.json({ error: "Page not found or already published" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("daily_pages")
      .update({ status: "published", published_at: now })
      .eq("id", page_id);

    if (error) {
      console.error("[admin/publish]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/heo/notebook");
    revalidatePath("/heo/notebook/today");
    revalidatePath("/masuri/notebook");
    revalidatePath("/masuri/notebook/review");

    return NextResponse.json({ ok: true, published: page.title_vi });
  } catch (err) {
    console.error("[admin/publish]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
