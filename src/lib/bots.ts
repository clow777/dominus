export const BOT_LIMIT = 50;

export type BotStatus = "online" | "offline" | "paused" | "disconnected";
export type CampaignAudience = "all" | "not_paid" | "paid" | "tag";

export const AUDIENCE_LABEL: Record<CampaignAudience, string> = {
  all: "Todos os leads",
  not_paid: "Quem ainda não pagou",
  paid: "Quem já pagou",
  tag: "Leads com uma tag",
};

/** Formato do token emitido pelo @BotFather: `<id numérico>:<segredo>`. */
export const BOT_TOKEN_RE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/;

export interface BotView {
  id: string;
  name: string;
  username: string;
  status: Exclude<BotStatus, "disconnected">;
  lastError: string | null;
  flowId: string | null;
  flowName: string | null;
  leads30d: number;
  sales30d: number;
  revenue30d: number;
}
