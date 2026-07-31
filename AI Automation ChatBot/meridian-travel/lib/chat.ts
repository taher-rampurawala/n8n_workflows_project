/**
 * Chat types + the single n8n integration point.
 *
 * There is deliberately NO conversation logic in the frontend. Intent
 * handling, FAQ answers, package discovery, enquiry lookup and lead capture
 * are all owned by the n8n agent. This file only moves text in and out.
 *
 * ── To connect n8n ────────────────────────────────────────────────────────
 * 1. Add to `.env.local`:
 *      NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://<your-n8n>/webhook/<path>
 * 2. In n8n: Webhook (POST, "Respond to Webhook" mode) → AI Agent →
 *    Respond to Webhook returning JSON `{ "reply": "..." }`.
 * 3. Enable CORS on the webhook for this site's origin.
 *
 * Nothing else in the UI needs to change.
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
}

/** Payload POSTed to the n8n webhook. */
export interface ChatRequest {
  message: string;
  /** Stable per-browser-tab id — use as the AI Agent's memory sessionId. */
  sessionId: string;
  /** Prior turns, oldest first, so n8n can rebuild context if it needs to. */
  history: Pick<ChatMessage, "role" | "text">[];
}

/** Expected n8n response. `reply` is the only required field. */
export interface ChatResponse {
  reply: string;
}

export const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL ?? "";
export const isChatConnected = WEBHOOK_URL.length > 0;

export const suggestedPrompts = [
  "Show me honeymoon trips to Bali",
  "What are your cancellation terms?",
  "Recommend a family trip under ₹3,00,000",
  "Do I need a visa for Japan?",
];

const PLACEHOLDER_REPLY =
  "I'm not connected to the travel assistant yet — the n8n agent that answers these questions hasn't been wired up. Once it is, this same window will handle package discovery, FAQs, enquiry status and callback requests. In the meantime the Contact form below reaches a real consultant.";

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * THE SWAP POINT. Sends one turn to n8n and resolves with the reply text.
 * Until the webhook env var is set, resolves with a short placeholder so the
 * UI stays demonstrable.
 */
export async function sendChatMessage(
  request: ChatRequest,
  signal?: AbortSignal,
): Promise<string> {
  if (!isChatConnected) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return PLACEHOLDER_REPLY;
  }

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Assistant unavailable (${response.status})`);
  }

  const data: Partial<ChatResponse> = await response.json();
  if (typeof data.reply !== "string" || data.reply.trim() === "") {
    throw new Error("Assistant returned an empty reply");
  }
  return data.reply;
}
