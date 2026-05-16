/**
 * /masuri/notebook/review/[id] — redirects to the full ApprovalUI.
 * Blueprint §5: Masuri can review and edit a specific draft page.
 * The approval UI is already built at /m/notebook/approve/[id].
 */
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MasuriReviewDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/m/notebook/approve/${id}`);
}
