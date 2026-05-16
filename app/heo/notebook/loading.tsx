const PAPER_BG = {
  backgroundImage: "radial-gradient(circle, rgba(168,50,79,0.06) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

export default function NotebookLoading() {
  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-8 pt-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-rose-100" />
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-xl bg-rose-100" />
          <div className="h-4 w-24 rounded-xl bg-rose-100/60" />
        </div>
      </div>
      {/* Today card */}
      <div className="rounded-3xl h-36 bg-rose-100/70 mb-4" />
      {/* Streak */}
      <div className="rounded-2xl h-24 bg-rose-100/50 mb-4" />
      {/* Grid tiles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl h-28 bg-rose-100/40" />
        <div className="rounded-2xl h-28 bg-rose-100/40" />
      </div>
    </div>
  );
}
