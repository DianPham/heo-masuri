import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ApprovalUI } from "./ApprovalUI";

export const revalidate = 30;

export default async function ApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: page, error } = await supabase
    .from("daily_pages")
    .select(
      "id, title_vi, title_en, topic, difficulty, cards, scheduled_for, status, generated_by, generation_meta, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !page) return notFound();

  return <ApprovalUI page={page} />;
}
