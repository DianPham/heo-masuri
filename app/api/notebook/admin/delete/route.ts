/**
 * POST /api/notebook/admin/delete
 * Masuri deletes a draft or approved page (cannot delete published pages).
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
      .select("id, status, title_vi")
      .eq("id", page_id)
      .in("status", ["draft", "approved"])
      .maybeSingle();

    if (!page) {
      return NextResponse.json(
        { error: "Page not found or already published (cannot delete)" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("daily_pages")
      .delete()
      .eq("id", page_id);

    if (error) {
      console.error("[admin/delete]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/masuri/notebook");
    revalidatePath("/masuri/notebook/review");

    return NextResponse.json({ ok: true, deleted: page.title_vi });
  } catch (err) {
    console.error("[admin/delete]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
