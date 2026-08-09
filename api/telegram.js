import { config } from "../lib/config.js";
import { sendTelegram, mainButtons } from "../lib/telegram.js";
import { getMarket } from "../lib/market.js";
import { getHolders } from "../lib/holders.js";
import { priceCard, holdersCard, statsCard } from "../lib/branding.js";

function commandOf(text = "") {
  return text.trim().split(/\s+/)[0].toLowerCase().split("@")[0];
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "BULLE Telegram webhook v2" });
  }
  if (req.method !== "POST") return res.status(405).end();

  const update = req.body || {};
  const msg = update.message || update.channel_post;
  if (!msg?.text) return res.status(200).json({ ok: true });

  if (config.chatId && String(msg.chat.id) !== String(config.chatId)) {
    return res.status(200).json({ ok: true });
  }

  const command = commandOf(msg.text);

  try {
    if (command === "/start" || command === "/bulle") {
      await sendTelegram(
        `🐂 <b>${config.tokenName}</b>\n` +
        `<i>The Cyber Bull of Solana</i>\n\n` +
        `⚡ Track the herd directly from Telegram.\n\n` +
        `Commands:\n` +
        `/price — live market data\n` +
        `/holders — holder distribution\n` +
        `/stats — full Stampede Report\n` +
        `/buy — official Pump.fun link\n` +
        `/ca — official contract address`,
        { chatId: msg.chat.id, replyMarkup: mainButtons() }
      );
    }

    if (command === "/price" || command === "/mc" || command === "/market") {
      const market = await getMarket();
      await sendTelegram(priceCard(market), {
        chatId: msg.chat.id,
        replyMarkup: mainButtons()
      });
    }

    if (command === "/holders") {
      const holders = await getHolders();
      await sendTelegram(holdersCard(holders), {
        chatId: msg.chat.id,
        replyMarkup: mainButtons()
      });
    }

    if (command === "/stats") {
      const [market, holders] = await Promise.all([getMarket(), getHolders()]);
      await sendTelegram(statsCard(market, holders), {
        chatId: msg.chat.id,
        replyMarkup: mainButtons()
      });
    }

    if (command === "/buy") {
      await sendTelegram(
        `🟢 <b>BUY ${config.tokenName}</b>\n\n` +
        `Always verify the official CA before buying:\n` +
        `<code>${config.mint}</code>`,
        { chatId: msg.chat.id, replyMarkup: mainButtons() }
      );
    }

    if (command === "/ca") {
      await sendTelegram(
        `🐂 <b>OFFICIAL ${config.tokenName} CA</b>\n\n<code>${config.mint}</code>`,
        { chatId: msg.chat.id, replyMarkup: mainButtons() }
      );
    }
  } catch (err) {
    console.error(err);
    await sendTelegram(
      `⚠️ BULLE Tracker could not load that data right now. Try again shortly.`,
      { chatId: msg.chat.id }
    ).catch(() => {});
  }

  return res.status(200).json({ ok: true });
}
