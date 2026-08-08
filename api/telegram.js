import { config } from "../lib/config.js";
import { sendTelegram, esc } from "../lib/telegram.js";
import { getMarket } from "../lib/market.js";
import { getHolders } from "../lib/holders.js";

function normalizeCommand(text = "") {
  return text.trim().split(/\s+/)[0].toLowerCase().split("@")[0];
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "BULLE Telegram webhook" });
  }
  if (req.method !== "POST") return res.status(405).end();

  const update = req.body || {};
  const msg = update.message || update.channel_post;
  if (!msg?.text) return res.status(200).json({ ok: true });

  // Only answer in the configured group, if one is configured.
  if (config.chatId && String(msg.chat.id) !== String(config.chatId)) {
    return res.status(200).json({ ok: true });
  }

  const command = normalizeCommand(msg.text);

  try {
    if (command === "/price" || command === "/mc") {
      const m = await getMarket();
      const text = m
        ? `🐂 <b>${esc(config.symbol)} MARKET</b>\n\n` +
          `💵 Price: <b>${m.fmtPrice}</b>\n` +
          `📈 Market Cap: <b>${m.fmtMarketCap}</b>\n` +
          `💧 Liquidity: <b>${m.fmtLiquidity}</b>\n` +
          `📊 24h: <b>${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}%</b>\n\n` +
          `<a href="${m.url}">View chart</a>`
        : `Market data for ${esc(config.symbol)} is not available yet.`;

      await sendTelegram(text, { chatId: msg.chat.id });
    }

    if (command === "/holders") {
      const h = await getHolders();
      await sendTelegram(
        `👥 <b>${esc(config.symbol)} HOLDERS</b>\n\n` +
        `🐂 Unique holders: <b>${h.holders.toLocaleString()}</b>` +
        (h.capped ? `+\n⚠️ Count capped for this request.` : ""),
        { chatId: msg.chat.id }
      );
    }

    if (command === "/stats") {
      const [m, h] = await Promise.all([getMarket(), getHolders()]);
      await sendTelegram(
        `🐂 <b>${esc(config.symbol)} STATS</b>\n\n` +
        `💵 Price: <b>${m?.fmtPrice || "N/A"}</b>\n` +
        `📈 Market Cap: <b>${m?.fmtMarketCap || "N/A"}</b>\n` +
        `💧 Liquidity: <b>${m?.fmtLiquidity || "N/A"}</b>\n` +
        `👥 Holders: <b>${h.holders.toLocaleString()}${h.capped ? "+" : ""}</b>`,
        { chatId: msg.chat.id }
      );
    }
  } catch (err) {
    console.error(err);
  }

  return res.status(200).json({ ok: true });
}
