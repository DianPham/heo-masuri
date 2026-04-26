import { BottomNav } from "@/components/nav/BottomNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { MissingIncoming } from "@/components/realtime/MissingIncoming";

export default function MasuriLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider who="masuri">
      <div className="min-h-dvh bg-rose-50 flex flex-col">
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>
        <BottomNav who="masuri" />
        <MissingIncoming />
      </div>
    </RealtimeProvider>
  );
}
