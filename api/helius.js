import { config } from "../lib/config.js";
import { sendTelegram, mainButtons } from "../lib/telegram.js";
import { getMarket } from "../lib/market.js";
import { parseBuy } from "../lib/buyParser.js";
import { buyAlert } from "../lib/branding.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "BULLE Helius webhook DEBUG"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  console.log("=== HELIUS WEBHOOK HIT ===");
  console.log("Body is array:", Array.isArray(req.body));
  console.log("Body length:", Array.isArray(req.body) ? req.body.length : 1);

  if (config.webhookSecret && req.query.secret !== config.webhookSecret) {
    console.log("HELIUS WEBHOOK: secret mismatch");
    return res.status(401).json({ ok: false, error: "secret mismatch" });
  }

  console.log("HELIUS WEBHOOK: secret accepted");

  const txs = Array.isArray(req.body) ? req.body : [req.body];

  try {
    for (const tx of txs) {
      console.log("HELIUS EVENT:", JSON.stringify({
        type: tx?.type,
        source: tx?.source,
        signature: tx?.signature,
        description: tx?.description
      }));

      const buy = parseBuy(tx);

      if (!buy) {
        console.log("HELIUS EVENT: transaction received but no BULLE buy detected");
        continue;
      }

      console.log("HELIUS EVENT: BULLE buy detected, preparing Telegram request");

      let market = null;
      try {
        market = await getMarket();
        console.log("MARKET DATA: loaded");
      } catch (e) {
        console.error("MARKET DATA ERROR:", e);
      }

      const usdValue =
        market?.priceUsd && buy.tokens
          ? market.priceUsd * buy.tokens
          : null;

      try {
        await sendTelegram(
          buyAlert({ buy, market, usdValue }),
          { replyMarkup: mainButtons() }
        );
        console.log("TELEGRAM: buy alert sent successfully");
      } catch (e) {
        console.error("TELEGRAM SEND ERROR:", e);
      }
    }
  } catch (err) {
    console.error("HELIUS HANDLER ERROR:", err);
  }

  console.log("=== HELIUS WEBHOOK END ===");
  return res.status(200).json({ ok: true });
}
