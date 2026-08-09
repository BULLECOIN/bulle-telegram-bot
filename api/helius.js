import { config } from "../lib/config.js";
import { sendTelegram, mainButtons } from "../lib/telegram.js";
import { getMarket } from "../lib/market.js";
import { parseBuy } from "../lib/buyParser.js";
import { buyAlert } from "../lib/branding.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "BULLE Helius webhook"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  if (config.webhookSecret && req.query.secret !== config.webhookSecret) {
    return res.status(401).json({
      ok: false,
      error: "secret mismatch"
    });
  }

  const txs = Array.isArray(req.body) ? req.body : [req.body];

  try {
    for (const tx of txs) {
      const buy = parseBuy(tx);
      if (!buy) continue;

      let market = null;

      try {
        market = await getMarket();
      } catch (e) {
        console.error("MARKET DATA ERROR:", e);
      }

      const usdValue =
        market?.priceUsd && buy.tokens
          ? market.priceUsd * buy.tokens
          : null;

      try {
        await sendTelegram(
          buyAlert({
            buy,
            market,
            usdValue
          }),
          {
            replyMarkup: mainButtons()
          }
        );

        console.log(
          `BULLE BUY ALERT SENT | ${buy.solSpent.toFixed(4)} SOL | ${buy.method}`
        );
      } catch (e) {
        console.error("TELEGRAM SEND ERROR:", e);
      }
    }
  } catch (err) {
    console.error("HELIUS HANDLER ERROR:", err);
  }

  return res.status(200).json({ ok: true });
}
