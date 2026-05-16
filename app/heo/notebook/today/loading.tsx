export default function TodayLoading() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{ backgroundColor: "#FFF9F5" }}
    >
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-rose-200/60" />
        <div className="h-4 w-24 rounded-xl bg-rose-100" />
      </div>
    </div>
  );
}
