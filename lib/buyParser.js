import { config } from "./config.js";

const LAMPORTS_PER_SOL = 1_000_000_000;
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const ui = (b) => num(b?.uiTokenAmount?.uiAmountString ?? b?.uiTokenAmount?.uiAmount ?? 0);

function accountKey(v) {
  if (!v) return null;
  return typeof v === "string" ? v : v.pubkey || null;
}

function getAccountKeys(tx, meta) {
  const msg = tx?.transaction?.message || tx?.transaction?.transaction?.message || tx?.message || {};
  const staticKeys = Array.isArray(msg.accountKeys) ? msg.accountKeys.map(accountKey).filter(Boolean) : [];
  return [
    ...staticKeys,
    ...(meta?.loadedAddresses?.writable || []),
    ...(meta?.loadedAddresses?.readonly || [])
  ];
}

function nativeChange(tx, account, accountKeys, meta) {
  if (Array.isArray(tx?.accountData)) {
    const row = tx.accountData.find(a => a?.account === account);
    const c = Number(row?.nativeBalanceChange);
    if (Number.isFinite(c)) return c;
  }

  const i = accountKeys.indexOf(account);
  if (i < 0) return null;
  const pre = Number(meta?.preBalances?.[i]);
  const post = Number(meta?.postBalances?.[i]);
  if (!Number.isFinite(pre) || !Number.isFinite(post)) return null;
  return post - pre;
}

function parseEnhanced(tx) {
  const transfers = Array.isArray(tx?.tokenTransfers) ? tx.tokenTransfers : [];
  const candidates = transfers
    .filter(t => t?.mint === config.mint && t?.toUserAccount && num(t?.tokenAmount) > 0)
    .sort((a,b) => num(b?.tokenAmount) - num(a?.tokenAmount));

  for (const t of candidates) {
    const buyer = t.toUserAccount;
    let solChange = null;

    if (Array.isArray(tx?.accountData)) {
      const row = tx.accountData.find(a => a?.account === buyer);
      const c = Number(row?.nativeBalanceChange);
      if (Number.isFinite(c)) solChange = c;
    }

    if (solChange == null) {
      const native = Array.isArray(tx?.nativeTransfers) ? tx.nativeTransfers : [];
      const out = native.filter(x => x?.fromUserAccount === buyer).reduce((s,x)=>s+num(x?.amount),0);
      const inc = native.filter(x => x?.toUserAccount === buyer).reduce((s,x)=>s+num(x?.amount),0);
      solChange = inc - out;
    }

    if (!(solChange < 0)) continue;

    const solSpent = Math.abs(solChange) / LAMPORTS_PER_SOL;
    if (solSpent < config.minBuySol) continue;

    return {
      buyer,
      tokens: num(t.tokenAmount),
      solSpent,
      signature: tx?.signature || "",
      method: "enhanced-strict"
    };
  }
  return null;
}

function parseBalances(tx) {
  const meta = tx?.meta || tx?.transaction?.meta || tx?.transaction?.transaction?.meta;
  if (!meta || meta.err) return null;

  const accountKeys = getAccountKeys(tx, meta);
  const byOwner = new Map();

  for (const b of (meta.preTokenBalances || [])) {
    if (b?.mint !== config.mint || !b?.owner) continue;
    const row = byOwner.get(b.owner) || { owner:b.owner, pre:0, post:0 };
    row.pre += ui(b);
    byOwner.set(b.owner,row);
  }

  for (const b of (meta.postTokenBalances || [])) {
    if (b?.mint !== config.mint || !b?.owner) continue;
    const row = byOwner.get(b.owner) || { owner:b.owner, pre:0, post:0 };
    row.post += ui(b);
    byOwner.set(b.owner,row);
  }

  const candidates = [...byOwner.values()]
    .map(x => ({...x, tokenChange:x.post-x.pre}))
    .filter(x => x.tokenChange > 0)
    .sort((a,b)=>b.tokenChange-a.tokenChange);

  for (const c of candidates) {
    const solChange = nativeChange(tx, c.owner, accountKeys, meta);

    // BUY only if SAME wallet gains BULLE and loses SOL.
    if (!(solChange < 0)) continue;

    const solSpent = Math.abs(solChange) / LAMPORTS_PER_SOL;
    if (solSpent < config.minBuySol) continue;

    return {
      buyer: c.owner,
      tokens: c.tokenChange,
      solSpent,
      signature:
        tx?.signature ||
        tx?.transaction?.signatures?.[0] ||
        tx?.transaction?.transaction?.signatures?.[0] ||
        "",
      method: "balance-strict"
    };
  }

  return null;
}

export function parseBuy(tx) {
  if (!tx || tx?.transactionError) return null;
  return parseEnhanced(tx) || parseBalances(tx) || null;
}
