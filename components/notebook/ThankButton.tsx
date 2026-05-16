"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ThankButton({ letterId }: { letterId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  async function handleThank() {
    if (state !== "idle") return;
    setState("sending");
    try {
      await fetch(`/api/notebook/letter/${letterId}/thank`, { method: "POST" });
    } catch {
      // push failure is non-critical
    }
    setState("done");
    setTimeout(() => router.push("/heo/notebook/letter"), 1200);
  }

  return (
    <div className="mt-4 text-center">
      {state === "done" ? (
        <p className="text-sm text-rose-400 font-medium">Đã gửi lời cảm ơn 💕</p>
      ) : (
        <button
          onClick={handleThank}
          disabled={state === "sending"}
          className="inline-flex items-center gap-2 text-sm font-medium text-rose-400 underline underline-offset-2 disabled:opacity-50"
        >
          {state === "sending" ? "Đang gửi..." : "Cảm ơn Masuri 💕"}
        </button>
      )}
    </div>
  );
}
