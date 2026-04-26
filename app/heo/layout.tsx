import { BottomNav } from "@/components/nav/BottomNav";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

export default function HeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider who="heo">
      <div className="min-h-dvh bg-rose-50 flex flex-col">
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>
        <BottomNav who="heo" />
      </div>
    </RealtimeProvider>
  );
}
