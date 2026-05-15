"use client";

/**
 * MasuriAskInbox — list of Heo's questions waiting for / receiving a reply.
 * Drops into the Masuri notebook home page.
 * Blueprint CP6.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

interface Thread {
  id: string;
  word_en: string | null;
  question_text: string;
  reply_text: string | null;
  replied_at: string | null;
  created_at: string;
}

export function MasuriAskInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notebook/ask")
      .then((r) => r.json())
      .then(({ threads }) => setThreads(threads ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-ink-soft">Đang tải...</p>;
  }

  if (threads.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Chưa có câu hỏi nào — Heo đang học tốt 🌸
      </p>
    );
  }

  const pending = threads.filter((t) => !t.reply_text);
  const answered = threads.filter((t) => t.reply_text);

  return (
    <div className="space-y-2.5">
      {pending.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
            Đang chờ Masuri trả lời ({pending.length})
          </p>
          {pending.slice(0, 5).map((t) => (
            <ThreadRow key={t.id} thread={t} urgent />
          ))}
        </>
      )}

      {answered.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mt-3">
            Đã trả lời
          </p>
          {answered.slice(0, 3).map((t) => (
            <ThreadRow key={t.id} thread={t} />
          ))}
        </>
      )}
    </div>
  );
}

function ThreadRow({ thread, urgent = false }: { thread: Thread; urgent?: boolean }) {
  const date = new Date(thread.created_at).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <Link
      href={`/masuri/notebook/ask/${thread.id}`}
      className="block rounded-xl p-3 active:scale-[0.98] transition-transform"
      style={{
        backgroundColor: urgent ? "rgba(255,201,213,0.2)" : "rgba(255,249,245,0.7)",
        border: urgent ? "1px solid rgba(233,122,149,0.35)" : "1px solid rgba(255,201,213,0.3)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {thread.word_en && (
            <p
              className="text-sm font-bold text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {thread.word_en}
            </p>
          )}
          <p className="text-xs text-ink-soft truncate">{thread.question_text}</p>
        </div>
        <span className="shrink-0 text-[10px] text-ink-soft">{date}</span>
      </div>
    </Link>
  );
}
