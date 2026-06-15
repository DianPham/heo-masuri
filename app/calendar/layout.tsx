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
import { SideNav } from "@/components/nav/SideNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

export default async function CalendarLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "heo" && who !== "masuri") {
    redirect("/");
  }

  // Tablet (md) keeps the phone-card aesthetic. Desktop (lg+) drops the
  // card so the calendar grid can use the full width — a centered phone
  // shape would waste horizontal space the calendar genuinely needs.
  return (
    <RealtimeProvider who={who}>
      <div
        className="min-h-dvh flex flex-col"
        style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}
      >
        <SideNav who={who} />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8 lg:pl-60">
          <div className="mx-auto w-full max-w-md md:max-w-lg md:min-h-[calc(100dvh-6rem)] md:my-6 md:rounded-3xl md:border md:border-rose-100/60 md:overflow-hidden md:bg-[#FFF9F5] md:shadow-[0_10px_40px_rgba(196,102,122,0.12)] lg:max-w-none lg:my-0 lg:rounded-none lg:border-0 lg:shadow-none lg:bg-transparent lg:overflow-visible lg:min-h-screen">
            {children}
          </div>
        </main>
        {/* Hide the floating BottomNav on lg+ — the SideNav covers navigation
           there, and the floating pill was overlapping the calendar grid. */}
        <div className="lg:hidden">
          <BottomNav who={who} />
        </div>
      </div>
    </RealtimeProvider>
  );
}
