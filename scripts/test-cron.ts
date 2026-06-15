#!/usr/bin/env npx tsx
/**
 * Manual test harness for Phase 2A cron workers.
 *
 * Loads .env.staging.local so createTypedServerClient connects to staging,
 * then calls the worker functions directly. Prints results so we can verify
 * behavior without needing the CRON_SECRET for HTTP auth.
 *
 * Usage:
 *   npx tsx scripts/test-cron.ts deliver
 *   npx tsx scripts/test-cron.ts gmgn
 */
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.staging.local") });

async function main() {
  const which = process.argv[2];
  if (which === "deliver") {
    const { runDeliverScheduled } = await import("../lib/crons/deliver-scheduled");
    const r = await runDeliverScheduled();
    console.log(JSON.stringify(r, null, 2));
  } else if (which === "gmgn") {
    const { runGmgnTick } = await import("../lib/crons/gmgn-tick");
    const r = await runGmgnTick();
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.error("Usage: tsx scripts/test-cron.ts <deliver|gmgn>");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
