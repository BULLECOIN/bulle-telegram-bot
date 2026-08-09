import { config } from "./config.js";

export async function getHolders() {
  if (!config.heliusApiKey) throw new Error("HELIUS_API_KEY is missing.");

  const byOwner = new Map();
  let cursor;
  let pages = 0;
  let tokenAccounts = 0;

  while (pages < 50) {
    const params = {
      mint: config.mint,
      limit: 1000,
      options: { showZeroBalance: false }
    };
    if (cursor) params.cursor = cursor;

    const r = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(config.heliusApiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "bulle-holders",
          method: "getTokenAccounts",
          params
        })
      }
    );

    if (!r.ok) throw new Error(`Helius HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(`Helius: ${JSON.stringify(j.error)}`);

    const result = j.result || j;
    const accounts = result.token_accounts || result.tokenAccounts || [];
    tokenAccounts += accounts.length;

    for (const a of accounts) {
      const owner = a.owner;
      const amount = Number(a.amount || 0);
      if (!owner || amount <= 0) continue;
      byOwner.set(owner, (byOwner.get(owner) || 0) + amount);
    }

    pages += 1;
    cursor = result.cursor;
    if (!cursor || accounts.length === 0) break;
  }

  const rows = [...byOwner.entries()]
    .map(([owner, amount]) => ({ owner, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalTracked = rows.reduce((s, r) => s + r.amount, 0);
  const top = rows.slice(0, 5).map(r => ({
    ...r,
    pct: totalTracked > 0 ? (r.amount / totalTracked) * 100 : 0
  }));

  const top5Pct = top.reduce((s, r) => s + r.pct, 0);

  return {
    holders: rows.length,
    tokenAccounts,
    top,
    top5Pct,
    capped: Boolean(cursor),
    pages
  };
}
