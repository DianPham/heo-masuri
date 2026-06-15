/**
 * Spin algorithm for the decision flipper. Blueprint §7.4.
 *
 *  - Equal-weight baseline
 *  - Candidates with last_used_at within 30 days → 0.3× weight ("don't repeat")
 *  - Candidates with used_count > average → 0.7× weight ("let new things win")
 *
 * Custom candidates (free-text, no idea reference) carry no history, so they
 * always get full weight.
 */

export type SlotCandidate = {
  id: string;                        // ephemeral id within the slot
  source: "date_idea" | "custom";
  label_vi: string;
  date_idea_id?: string | null;       // FK to date_ideas when source='date_idea'
  used_count?: number;                // copied from date_ideas at add time
  last_used_at?: string | null;
  addedBy?: string;                   // user id of whoever added it
};

const THIRTY_DAYS_MS = 30 * 24 * 3_600_000;

export function pickForSlot(candidates: SlotCandidate[], now = Date.now()): SlotCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const counts = candidates
    .map((c) => c.used_count ?? 0)
    .filter((n) => n > 0);
  const avgUsed = counts.length === 0 ? 0 : counts.reduce((a, b) => a + b, 0) / counts.length;

  const weights = candidates.map((c) => {
    let w = 1;
    if (c.last_used_at) {
      const t = new Date(c.last_used_at).getTime();
      if (!isNaN(t) && now - t < THIRTY_DAYS_MS) w *= 0.3;
    }
    if ((c.used_count ?? 0) > avgUsed) w *= 0.7;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];

  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
