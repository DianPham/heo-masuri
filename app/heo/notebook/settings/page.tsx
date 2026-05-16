/**
 * /heo/notebook/settings — Notebook preferences
 * CP8: reminder toggle + preferred topics
 */
import { NotebookSettings } from "@/components/notebook/NotebookSettings";

export const revalidate = 60;

export default function NotebookSettingsPage() {
  return (
    <div className="min-h-dvh px-5 pb-8 pt-10" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-ink leading-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cài đặt
        </h1>
        <p className="text-sm text-ink-soft">Nhắc nhở & chủ đề yêu thích</p>
      </div>

      <NotebookSettings />
    </div>
  );
}
