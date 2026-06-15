/**
 * GET/POST /api/cron/deliver-scheduled
 *
 * Public endpoint for manual triggers (Bearer ${CRON_SECRET}). The real
 * work lives in lib/crons/deliver-scheduled.ts so the dispatcher can call
 * it without self-HTTP, and so Next.js App Router's "only GET/POST exports"
 * rule doesn't reject the build.
 */
import { NextRequest, NextResponse } from "next/server";
import { runDeliverScheduled } from "@/lib/crons/deliver-scheduled";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runDeliverScheduled());
}

export const GET = handle;
export const POST = handle;
