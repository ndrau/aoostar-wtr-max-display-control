export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { appendLog } = await import("./lib/logger");
    const { startScheduler } = await import("./lib/scheduler");

    await appendLog("info", "system", "Web UI started");
    startScheduler();
  }
}
