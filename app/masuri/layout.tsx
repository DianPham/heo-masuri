import { BottomNav } from "@/components/nav/BottomNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { MissingIncoming } from "@/components/realtime/MissingIncoming";
import { ThinkingIncoming } from "@/components/realtime/ThinkingIncoming";
import { PushPermission } from "@/components/notifications/PushPermission";
import { AngryIncoming } from "@/components/angry/AngryIncoming";

export default function MasuriLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider who="masuri">
      <div className="min-h-dvh flex flex-col" style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}>
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>
        <BottomNav who="masuri" />
        <MissingIncoming />
        <ThinkingIncoming who="masuri" />
        <AngryIncoming who="masuri" />
        <PushPermission />
      </div>
    </RealtimeProvider>
  );
}
