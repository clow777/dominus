export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./server/jobs");
    startScheduler();
    const { announceEleva } = await import("./server/payments/eleva-summary");
    void announceEleva();
  }
}
