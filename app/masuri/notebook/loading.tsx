const PAPER_BG = {
  backgroundImage: "radial-gradient(circle, rgba(168,50,79,0.06) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

export default function MasuriNotebookLoading() {
  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-8 pt-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-rose-100" />
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-xl bg-rose-100" />
          <div className="h-4 w-28 rounded-xl bg-rose-100/60" />
        </div>
      </div>
      {/* Status card */}
      <div className="rounded-2xl h-32 bg-rose-200/40 mb-4" />
      {/* Actions card */}
      <div className="rounded-2xl h-40 bg-amber-100/40 mb-4" />
      {/* Ask inbox */}
      <div className="rounded-2xl h-48 bg-white/60 mb-4" />
    </div>
  );
}
