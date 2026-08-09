import { config } from "./config.js";
import { tokenAmount, shortWallet, signedPct } from "./format.js";
import { esc } from "./telegram.js";
import { marketMood } from "./market.js";

function buyTier(sol) {
  if (sol >= 5) return {
    title: "🚨🚨 MEGA STAMPEDE 🚨🚨",
    line: "A monster bull just entered the arena.",
    meter: "🐂🐂🐂🐂🐂🐂🐂🐂🐂🐂"
  };
  if (sol >= 2) return {
    title: "🐋🔥 WHALE BULL BUY 🔥🐋",
    line: "Heavy hoofprints detected on Solana.",
    meter: "🐂🐂🐂🐂🐂🐂🐂🐂"
  };
  if (sol >= 0.75) return {
    title: "🔥 BIG BULL BUY 🔥",
    line: "The stampede is getting louder.",
    meter: "🐂🐂🐂🐂🐂🐂"
  };
  if (sol >= 0.20) return {
    title: "⚡ STAMPEDE ALERT ⚡",
    line: "Another bull is charging in.",
    meter: "🐂🐂🐂🐂"
  };
  return {
    title: "🟢 NEW BULL JOINED",
    line: "The herd just got stronger.",
    meter: "🐂🐂"
  };
}

export function buyAlert({ buy, market, usdValue }) {
  const tier = buyTier(buy.solSpent);
  const walletUrl = `https://solscan.io/account/${encodeURIComponent(buy.buyer)}`;
  const txUrl = `https://solscan.io/tx/${encodeURIComponent(buy.signature)}`;

  return (
    `${tier.title}\n` +
    `<b>${esc(config.tokenName)} • $${esc(config.symbol)}</b>\n\n` +
    `${tier.meter}\n` +
    `<i>${tier.line}</i>\n\n` +
    `◎ <b>${buy.solSpent.toFixed(3)} SOL</b> spent\n` +
    `🐂 <b>${tokenAmount(buy.tokens)} ${esc(config.symbol)}</b> bought\n` +
    (usdValue ? `💵 Approx. value: <b>$${usdValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</b>\n` : "") +
    (market ? `📈 Market Cap: <b>${market.fmt.marketCap}</b>\n` : "") +
    (market ? `💧 Liquidity: <b>${market.fmt.liquidity}</b>\n` : "") +
    `👤 Buyer: <a href="${walletUrl}">${esc(shortWallet(buy.buyer))}</a>\n\n` +
    `⚡ <b>JOIN THE STAMPEDE</b>\n` +
    `<a href="${config.pumpUrl}">BUY</a> • <a href="${txUrl}">TX</a>`
  );
}

export function priceCard(market) {
  if (!market) {
    return `🐂 <b>${esc(config.tokenName)} MARKET</b>\n\nMarket data is not available yet.`;
  }

  return (
    `🐂 <b>${esc(config.tokenName)} MARKET</b>\n` +
    `<i>The Cyber Bull of Solana</i>\n\n` +
    `💵 Price: <b>${market.fmt.price}</b>\n` +
    `📈 Market Cap: <b>${market.fmt.marketCap}</b>\n` +
    `💧 Liquidity: <b>${market.fmt.liquidity}</b>\n` +
    `📊 24h Volume: <b>${market.fmt.volume24h}</b>\n` +
    `⚡ 24h Change: <b>${market.fmt.change24h}</b>\n` +
    `🟢 Buys / 🔴 Sells: <b>${market.buys24h} / ${market.sells24h}</b>\n\n` +
    `${marketMood(market.change24h, market.buys24h, market.sells24h)}\n\n` +
    `⚠️ Market data only — not financial advice.`
  );
}

export function holdersCard(h) {
  const topLines = h.top.map((x, i) => {
    const url = `https://solscan.io/account/${encodeURIComponent(x.owner)}`;
    return `${i+1}. <a href="${url}">${esc(shortWallet(x.owner))}</a> — <b>${x.pct.toFixed(2)}%</b>`;
  }).join("\n");

  let concentration;
  if (h.top5Pct < 20) concentration = "🟢 Distribution: <b>relatively spread</b>";
  else if (h.top5Pct < 40) concentration = "🟡 Distribution: <b>moderately concentrated</b>";
  else concentration = "🟠 Distribution: <b>high top-wallet concentration</b>";

  return (
    `👥 <b>${esc(config.tokenName)} HOLDERS</b>\n` +
    `<i>Know the herd.</i>\n\n` +
    `🐂 Unique token owners: <b>${h.holders.toLocaleString()}${h.capped ? "+" : ""}</b>\n` +
    `🏦 Top 5 share: <b>${h.top5Pct.toFixed(2)}%</b>\n` +
    `${concentration}\n\n` +
    `<b>Top tracked wallets</b>\n${topLines || "No holder data yet."}\n\n` +
    `ℹ️ Token-program/liquidity accounts may appear among the largest addresses.`
  );
}

export function statsCard(market, holders) {
  return (
    `⚡ <b>${esc(config.tokenName)} STAMPEDE REPORT</b>\n\n` +
    `💵 Price: <b>${market?.fmt.price || "N/A"}</b>\n` +
    `📈 Market Cap: <b>${market?.fmt.marketCap || "N/A"}</b>\n` +
    `💧 Liquidity: <b>${market?.fmt.liquidity || "N/A"}</b>\n` +
    `📊 24h Volume: <b>${market?.fmt.volume24h || "N/A"}</b>\n` +
    `⚡ 24h: <b>${market?.fmt.change24h || "N/A"}</b>\n` +
    `👥 Holders: <b>${holders?.holders?.toLocaleString() || "N/A"}</b>\n` +
    (holders ? `🏦 Top 5 share: <b>${holders.top5Pct.toFixed(2)}%</b>\n` : "") +
    `\n🐂 <b>ONE BULL. ONE CHAIN. ONE FUTURE.</b>`
  );
}
