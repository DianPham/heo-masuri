/**
 * GET /api/notebook/letter/prompts/today
 * Returns the rotating weekly prompt for the current week.
 * Rotates through letter_prompts by ISO week number.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: prompts, error } = await supabase
      .from("letter_prompts")
      .select("id, prompt_vi, prompt_en, starter_words, difficulty")
      .order("id", { ascending: true });

    if (error || !prompts || prompts.length === 0) {
      return NextResponse.json({ prompt: null });
    }

    // Pick by ISO week number so it's consistent all week
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 86_400_000));
    const index = weekNum % prompts.length;
    const prompt = prompts[index];

    return NextResponse.json({
      prompt: {
        ...prompt,
        starter_words: Array.isArray(prompt.starter_words)
          ? prompt.starter_words
          : (prompt.starter_words as string[] | null) ?? [],
      },
    });
  } catch (err) {
    console.error("[prompts/today]", err);
    return NextResponse.json({ prompt: null });
  }
}
