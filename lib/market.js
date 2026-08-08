import { config } from "./config.js";

function money(n, max = 8) {
  if (n == null || !Number.isFinite(Number(n))) return "N/A";
  const x = Number(n);
  if (Math.abs(x) >= 1_000_000) return `$${(x / 1_000_000).toFixed(2)}M`;
  if (Math.abs(x) >= 1_000) return `$${(x / 1_000).toFixed(2)}K`;
  if (Math.abs(x) >= 1) return `$${x.toFixed(4)}`;
  return `$${x.toFixed(max)}`;
}

export async function getMarket() {
  const r = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/solana/${config.mint}`,
    { headers: { accept: "application/json" } }
  );
  if (!r.ok) throw new Error(`DexScreener HTTP ${r.status}`);

  const pairs = await r.json();
  if (!Array.isArray(pairs) || !pairs.length) return null;

  // Prefer deepest USD liquidity.
  const pair = [...pairs].sort(
    (a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0)
  )[0];

  return {
    priceUsd: Number(pair.priceUsd || 0),
    marketCap: Number(pair.marketCap || pair.fdv || 0),
    liquidityUsd: Number(pair?.liquidity?.usd || 0),
    change24h: Number(pair?.priceChange?.h24 || 0),
    dex: pair.dexId || "DEX",
    url: pair.url || `https://dexscreener.com/solana/${config.mint}`,
    fmtPrice: money(pair.priceUsd, 10),
    fmtMarketCap: money(pair.marketCap || pair.fdv, 2),
    fmtLiquidity: money(pair?.liquidity?.usd, 2)
  };
}
