import { runRetention } from "@/lib/retention";

/**
 * Runs one-time startup tasks (data retention pruning, cache cleanup).
 * Executed once per server lifecycle via a module-level flag.
 */
let startupDone = false;

export async function runStartupTasks(): Promise<void> {
  if (startupDone) return;
  startupDone = true;

  // Run retention pruning (non-blocking in dev, awaited in production)
  try {
    await runRetention();
  } catch {
    /* ignore — non-critical */
  }
}
