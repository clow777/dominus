import "server-only";

/** Cliente mínimo da Telegram Bot API (https://core.telegram.org/bots/api). */

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
  get blocked() {
    return this.code === 403;
  }
  get unauthorized() {
    return this.code === 401;
  }
}

interface ApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

async function call<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new TelegramError("Não foi possível falar com o Telegram.", 0);
  }
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json?.ok) throw new TelegramError(json?.description ?? `Erro ${res.status}`, json?.error_code ?? res.status, json?.parameters?.retry_after);
  return json.result as T;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface WebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export interface InlineButton {
  text: string;
  url: string;
}

export const getMe = (token: string) => call<TelegramUser>(token, "getMe");
export const getWebhookInfo = (token: string) => call<WebhookInfo>(token, "getWebhookInfo");
export const deleteWebhook = (token: string) => call<true>(token, "deleteWebhook");

export const setWebhook = (token: string, url: string, secretToken: string) =>
  call<true>(token, "setWebhook", { url, secret_token: secretToken, allowed_updates: ["message", "my_chat_member"] });

function markup(buttons: InlineButton[]) {
  return buttons.length > 0 ? { inline_keyboard: buttons.map((b) => [{ text: b.text, url: b.url }]) } : undefined;
}

export function sendMessage(token: string, chatId: string, text: string, buttons: InlineButton[] = []) {
  return call<unknown>(token, "sendMessage", { chat_id: chatId, text, reply_markup: markup(buttons) });
}

export function sendPhoto(token: string, chatId: string, photoUrl: string, caption: string, buttons: InlineButton[] = []) {
  return call<unknown>(token, "sendPhoto", { chat_id: chatId, photo: photoUrl, caption, reply_markup: markup(buttons) });
}

/** Foto de perfil do bot (melhor esforço): devolve o caminho do arquivo ou null. */
export async function getProfilePhotoPath(token: string, botUserId: string): Promise<string | null> {
  const photos = await call<{ photos: { file_id: string }[][] }>(token, "getUserProfilePhotos", { user_id: Number(botUserId), limit: 1 });
  const sizes = photos.photos[0];
  const fileId = sizes?.[sizes.length - 1]?.file_id;
  if (!fileId) return null;
  const file = await call<{ file_path?: string }>(token, "getFile", { file_id: fileId });
  return file.file_path ?? null;
}

export function telegramFileUrl(token: string, path: string) {
  return `https://api.telegram.org/file/bot${token}/${path}`;
}
