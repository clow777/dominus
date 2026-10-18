import type { Metadata } from "next";

import { NewBotView } from "@/components/bots/new-bot-view";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Criar Novo Bot", robots: { index: false } };

export default async function NovoBotPage() {
  await requireApproved();
  return <NewBotView />;
}
