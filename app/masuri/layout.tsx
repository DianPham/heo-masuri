import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { MissingIncoming } from "@/components/realtime/MissingIncoming";
import { ThinkingIncoming } from "@/components/realtime/ThinkingIncoming";
import { PushPermission } from "@/components/notifications/PushPermission";
import { AngryIncoming } from "@/components/angry/AngryIncoming";

export default function MasuriLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider who="masuri">
      <div
        className="min-h-dvh flex flex-col"
        style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}
      >
        <SideNav who="masuri" />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-32 lg:pb-8 lg:pl-60">
          <div className="mx-auto w-full max-w-md md:max-w-lg md:min-h-[calc(100dvh-6rem)] md:my-6 md:rounded-3xl md:shadow-[0_10px_40px_rgba(139,92,246,0.12)] md:border md:border-purple-100/60 md:overflow-hidden md:bg-[#FFF9F5]">
            {children}
          </div>
        </main>
        {/* BottomNav is mobile/tablet only; SideNav covers nav at lg+ */}
        <div className="lg:hidden">
          <BottomNav who="masuri" />
        </div>
        <MissingIncoming />
        <ThinkingIncoming who="masuri" />
        <AngryIncoming who="masuri" />
        <PushPermission />
      </div>
    </RealtimeProvider>
  );
}
