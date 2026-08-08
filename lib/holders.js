import { config } from "./config.js";

export async function getHolders() {
  if (!config.heliusApiKey) throw new Error("HELIUS_API_KEY is missing.");

  const owners = new Set();
  let cursor = undefined;
  let pages = 0;
  let indexedTotal = 0;

  // Safety cap. For a young token this is normally more than enough.
  while (pages < 25) {
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
    indexedTotal = Number(result.total || indexedTotal);

    for (const a of accounts) {
      const amount = Number(a.amount || 0);
      if (a.owner && amount > 0) owners.add(a.owner);
    }

    pages += 1;
    cursor = result.cursor;
    if (!cursor || accounts.length === 0) break;
  }

  return {
    holders: owners.size,
    tokenAccounts: indexedTotal,
    capped: Boolean(cursor),
    pages
  };
}
