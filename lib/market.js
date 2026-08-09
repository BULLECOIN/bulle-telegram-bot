import { config } from "./config.js";
import { usd, signedPct } from "./format.js";

export async function getMarket() {
  const r = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/solana/${config.mint}`,
    { headers: { accept: "application/json" } }
  );
  if (!r.ok) throw new Error(`DexScreener HTTP ${r.status}`);

  const pairs = await r.json();
  if (!Array.isArray(pairs) || !pairs.length) return null;

  const pair = [...pairs].sort(
    (a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0)
  )[0];

  return {
    pairAddress: pair.pairAddress,
    dex: pair.dexId || "DEX",
    priceUsd: Number(pair.priceUsd || 0),
    marketCap: Number(pair.marketCap || pair.fdv || 0),
    fdv: Number(pair.fdv || 0),
    liquidityUsd: Number(pair?.liquidity?.usd || 0),
    volume24h: Number(pair?.volume?.h24 || 0),
    change5m: Number(pair?.priceChange?.m5 || 0),
    change1h: Number(pair?.priceChange?.h1 || 0),
    change6h: Number(pair?.priceChange?.h6 || 0),
    change24h: Number(pair?.priceChange?.h24 || 0),
    buys24h: Number(pair?.txns?.h24?.buys || 0),
    sells24h: Number(pair?.txns?.h24?.sells || 0),
    url: pair.url || `https://dexscreener.com/solana/${config.mint}`,
    fmt: {
      price: usd(pair.priceUsd),
      marketCap: usd(pair.marketCap || pair.fdv),
      liquidity: usd(pair?.liquidity?.usd),
      volume24h: usd(pair?.volume?.h24),
      change24h: signedPct(pair?.priceChange?.h24 || 0)
    }
  };
}

export function marketMood(change24h = 0, buys = 0, sells = 0) {
  const c = Number(change24h || 0);
  const b = Number(buys || 0);
  const s = Number(sells || 0);

  if (c >= 25) return "🔥 <b>STAMPede mode:</b> strong upside momentum in the last 24h.";
  if (c >= 8) return "⚡ <b>Bulls are pushing:</b> positive 24h momentum.";
  if (c > -8) {
    if (b > s * 1.25) return "🐂 <b>Accumulation zone:</b> buy activity is leading.";
    if (s > b * 1.25) return "🛡️ <b>Holding the line:</b> sell activity is heavier.";
    return "⚖️ <b>Market balanced:</b> buyers and sellers are battling.";
  }
  if (c > -25) return "🩸 <b>Pressure zone:</b> price is down over 24h; volatility is elevated.";
  return "🚨 <b>High volatility:</b> major 24h downside move. Verify liquidity and trade carefully.";
}
