import { BottomNav } from "@/components/nav/BottomNav";

export default function HeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-rose-50 flex flex-col">
      {/* pb-24 clears the fixed bottom nav (≈ 56px) + safe area */}
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>
      <BottomNav who="heo" />
    </div>
  );
}
