import { config } from "../lib/config.js";
import { sendTelegram, esc } from "../lib/telegram.js";
import { getMarket } from "../lib/market.js";
import { parseBuy } from "../lib/buyParser.js";

function shortWallet(w = "") {
  return w.length > 10 ? `${w.slice(0, 5)}...${w.slice(-5)}` : w;
}

function fmtTokens(n) {
  if (!Number.isFinite(n)) return "N/A";
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "BULLE Helius webhook" });
  }
  if (req.method !== "POST") return res.status(405).end();

  // Put the same secret at the end of the Helius webhook URL:
  // https://YOUR-DOMAIN/api/helius?secret=YOUR_SECRET
  if (config.webhookSecret && req.query.secret !== config.webhookSecret) {
    return res.status(401).json({ ok: false });
  }

  const txs = Array.isArray(req.body) ? req.body : [req.body];

  try {
    for (const tx of txs) {
      const buy = parseBuy(tx);
      if (!buy) continue;

      let market = null;
      try { market = await getMarket(); } catch {}

      const usdSpent =
        market?.priceUsd && buy.tokens
          ? market.priceUsd * buy.tokens
          : null;

      const txUrl = `https://solscan.io/tx/${encodeURIComponent(buy.signature || "")}`;
      const walletUrl = `https://solscan.io/account/${encodeURIComponent(buy.buyer)}`;
      const pumpUrl = `https://pump.fun/coin/${config.mint}`;

      const text =
        `🟢🟢 <b>${esc(config.symbol)} BUY!</b> 🟢🟢\n\n` +
        `💰 Bought: <b>${fmtTokens(buy.tokens)} ${esc(config.symbol)}</b>\n` +
        `◎ Spent: <b>${buy.solSpent.toFixed(3)} SOL</b>\n` +
        (usdSpent ? `💵 Value: <b>$${usdSpent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>\n` : "") +
        (market ? `📈 MC: <b>${market.fmtMarketCap}</b>\n` : "") +
        `👤 Buyer: <a href="${walletUrl}">${esc(shortWallet(buy.buyer))}</a>\n\n` +
        `<a href="${pumpUrl}">BUY</a> • <a href="${txUrl}">TX</a>`;

      await sendTelegram(text);
    }
  } catch (err) {
    console.error(err);
  }

  return res.status(200).json({ ok: true });
}
