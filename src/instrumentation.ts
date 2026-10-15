/**
 * Starts the olympus export loop inside the server process, so the host
 * needs no separate cron. Off unless BACON_EXPORT_MINUTES is set, which
 * keeps dev servers and tests from committing to olympus.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const minutes = Number(process.env.BACON_EXPORT_MINUTES);
  const repo = process.env.OLYMPUS_REPO_PATH;
  if (!minutes || !repo) return;

  const { getDb } = await import("@/lib/db/client");
  const { exportToOlympus } = await import("@/lib/bacon/olympus-export");
  const baseUrl = process.env.BACON_PUBLIC_URL ?? "https://tasks.olartgabo.dev";

  let running = false;
  // A slow push can outlast the interval; skip a tick rather than run two
  // git processes against the same checkout.
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await exportToOlympus(getDb(), repo, { baseUrl, push: true });
      if (result.committed) console.info(`olympus export: pushed ${result.sha}`);
    } catch (err) {
      // Logged, not thrown: one failed push (network, a non-fast-forward)
      // must not take down the server. The next tick retries.
      console.error("olympus export failed", err);
    } finally {
      running = false;
    }
  };
  setInterval(tick, minutes * 60_000).unref();
  void tick();
}
