import { BottomNav } from "@/components/nav/BottomNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { ThinkingIncoming } from "@/components/realtime/ThinkingIncoming";
import { ReunionListener } from "@/components/realtime/ReunionListener";
import { PushPermission } from "@/components/notifications/PushPermission";
import { AngryIncoming } from "@/components/angry/AngryIncoming";

export default function HeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider who="heo">
      <div className="min-h-dvh flex flex-col" style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}>
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>
        <BottomNav who="heo" />
        <ThinkingIncoming who="heo" />
        <AngryIncoming who="heo" />
        <ReunionListener />
        <PushPermission />
      </div>
    </RealtimeProvider>
  );
}
