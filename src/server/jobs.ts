import "server-only";

import { checkDueBots } from "@/server/telegram/bots";
import { runCampaignTick } from "@/server/telegram/campaigns";
import { runFlowTick } from "@/server/flows/engine";
import { processDueEvents } from "@/server/events";
import { pollPendingElevaCharges } from "@/server/payments/settle";

let running = false;

/** Um ciclo do agendador: eventos, fluxos, campanhas e saúde dos bots (a cada 5 min por bot). */
export async function runTick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await processDueEvents();
    await runFlowTick();
    await pollPendingElevaCharges();
    await runCampaignTick();
    await checkDueBots();
  } catch (err) {
    console.error("[jobs]", err);
  } finally {
    running = false;
  }
}

const TICK_MS = 5_000;
const g = globalThis as { __dominusScheduler?: ReturnType<typeof setInterval> };

/** Agendador em processo (Node contínuo). Em serverless, use /api/jobs/tick com CRON_SECRET. */
export function startScheduler(): void {
  if (g.__dominusScheduler) return;
  g.__dominusScheduler = setInterval(() => void runTick(), TICK_MS);
  g.__dominusScheduler.unref?.();
}
