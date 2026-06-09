/**
 * /calendar layout — shared between Heo and Masuri (blueprint §6.3).
 *
 * Mirrors the /heo and /masuri shells so the bottom nav and realtime
 * provider are present. Identity comes from the soft-gate cookie; middleware
 * has already verified that `who` is one of 'heo' | 'masuri' by the time we
 * reach here.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

export default async function CalendarLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "heo" && who !== "masuri") {
    redirect("/");
  }

  // Desktop card shadow color picks up the same theme cue the per-side
  // layouts use. Tailwind JIT requires literal class strings — using inline
  // style for the dynamic part.
  const desktopShadow =
    who === "heo"
      ? "0 10px 40px rgba(196,102,122,0.12)"
      : "0 10px 40px rgba(139,92,246,0.12)";

  return (
    <RealtimeProvider who={who}>
      <div
        className="min-h-dvh flex flex-col"
        style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}
      >
        <main className="flex-1 overflow-y-auto pb-24 md:pb-32">
          <div
            className="mx-auto w-full max-w-md md:max-w-lg md:min-h-[calc(100dvh-6rem)] md:my-6 md:rounded-3xl md:border md:border-rose-100/60 md:overflow-hidden md:bg-[#FFF9F5]"
            style={{ boxShadow: desktopShadow }}
          >
            {children}
          </div>
        </main>
        <BottomNav who={who} />
      </div>
    </RealtimeProvider>
  );
}
