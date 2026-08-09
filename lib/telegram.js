import { config } from "./config.js";

export function esc(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function telegram(method, payload) {
  if (!config.telegramToken) throw new Error("TELEGRAM_BOT_TOKEN is missing.");

  const r = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram ${method}: ${JSON.stringify(j)}`);
  return j.result;
}

export async function sendTelegram(text, {
  chatId = config.chatId,
  replyMarkup,
  disablePreview = true
} = {}) {
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is missing.");

  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: disablePreview,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

export function mainButtons() {
  return {
    inline_keyboard: [
      [
        { text: "🟢 BUY $BULLE", url: config.pumpUrl },
        { text: "📊 CHART", url: `https://dexscreener.com/solana/${config.mint}` }
      ],
      [
        { text: "🌐 WEBSITE", url: config.website },
        { text: "𝕏 X", url: config.xUrl }
      ]
    ]
  };
}
