import { config } from "../lib/config.js";
import { sendTelegram, mainButtons } from "../lib/telegram.js";
import { getMarket } from "../lib/market.js";
import { parseBuy } from "../lib/buyParser.js";
import { buyAlert } from "../lib/branding.js";

const KEY = "__BULLE_SEEN_SIGNATURES__";
if (!globalThis[KEY]) globalThis[KEY] = new Map();
const seen = globalThis[KEY];
const TTL = 30 * 60 * 1000;

function isDuplicate(signature) {
  if (!signature) return false;

  const cutoff = Date.now() - TTL;
  for (const [sig, ts] of seen.entries()) {
    if (ts < cutoff) seen.delete(sig);
  }

  if (seen.has(signature)) return true;
  seen.set(signature, Date.now());
  return false;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok:true, service:"BULLE buy-only webhook" });
  }
  if (req.method !== "POST") return res.status(405).end();

  if (config.webhookSecret && req.query.secret !== config.webhookSecret) {
    return res.status(401).json({ ok:false, error:"secret mismatch" });
  }

  const txs = Array.isArray(req.body) ? req.body : [req.body];
  const batchSeen = new Set();

  try {
    for (const tx of txs) {
      const signature =
        tx?.signature ||
        tx?.transaction?.signatures?.[0] ||
        tx?.transaction?.transaction?.signatures?.[0] ||
        "";

      if (signature && batchSeen.has(signature)) {
        console.log("BULLE DUPLICATE SKIPPED (batch):", signature);
        continue;
      }
      if (signature) batchSeen.add(signature);

      if (isDuplicate(signature)) {
        console.log("BULLE DUPLICATE SKIPPED:", signature);
        continue;
      }

      const buy = parseBuy(tx);

      if (!buy) {
        console.log("BULLE NON-BUY SKIPPED:", signature || "(no signature)");
        continue;
      }

      let market = null;
      try { market = await getMarket(); }
      catch (e) { console.error("MARKET DATA ERROR:", e); }

      const usdValue =
        market?.priceUsd && buy.tokens
          ? market.priceUsd * buy.tokens
          : null;

      await sendTelegram(
        buyAlert({ buy, market, usdValue }),
        { replyMarkup: mainButtons() }
      );

      console.log(
        `BULLE BUY ALERT SENT | ${buy.solSpent.toFixed(4)} SOL | ${buy.method} | ${signature}`
      );
    }
  } catch (err) {
    console.error("HELIUS HANDLER ERROR:", err);
  }

  return res.status(200).json({ ok:true });
}
