/**
 * GET/POST /api/cron/gmgn-tick
 *
 * Thin handler — real logic in lib/crons/gmgn-tick.ts (Next.js App Router
 * rejects non-handler exports from route files at build time).
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}.
 */
import { NextRequest, NextResponse } from "next/server";
import { runGmgnTick } from "@/lib/crons/gmgn-tick";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runGmgnTick());
}

export const GET = handle;
export const POST = handle;
