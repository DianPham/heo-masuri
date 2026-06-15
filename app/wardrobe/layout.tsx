/**
 * /wardrobe layout — shared between Heo and Masuri.
 *
 * Mirrors the /calendar layout so every wardrobe page gets the
 * BottomNav (mobile) and SideNav (lg+) plus realtime. Identity comes
 * from the soft-gate cookie; middleware has already verified who.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

export default async function WardrobeLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "heo" && who !== "masuri") {
    redirect("/");
  }

  return (
    <RealtimeProvider who={who}>
      <div className="min-h-dvh flex flex-col" style={{ background: "var(--color-cream)" }}>
        <SideNav who={who} />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8 lg:pl-60">
          {children}
        </main>
        <div className="lg:hidden">
          <BottomNav who={who} />
        </div>
      </div>
    </RealtimeProvider>
  );
}
