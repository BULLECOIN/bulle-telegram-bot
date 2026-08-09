import { config } from "./config.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

function toPubkey(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v.pubkey || null;
}

function getAccountKeys(tx) {
  // Enhanced transaction payloads may expose accountData directly.
  if (Array.isArray(tx?.accountData) && tx.accountData.length) {
    return tx.accountData.map(a => a?.account).filter(Boolean);
  }

  // Raw/jsonParsed transaction fallback.
  const msg = tx?.transaction?.message || tx?.message || {};
  const staticKeys = Array.isArray(msg.accountKeys)
    ? msg.accountKeys.map(toPubkey).filter(Boolean)
    : [];

  const loadedWritable =
    tx?.meta?.loadedAddresses?.writable ||
    tx?.transaction?.meta?.loadedAddresses?.writable ||
    [];

  const loadedReadonly =
    tx?.meta?.loadedAddresses?.readonly ||
    tx?.transaction?.meta?.loadedAddresses?.readonly ||
    [];

  return [...staticKeys, ...loadedWritable, ...loadedReadonly];
}

function parseFromEnhancedTransfers(tx) {
  const transfers = Array.isArray(tx?.tokenTransfers) ? tx.tokenTransfers : [];

  const received = transfers
    .filter(
      t =>
        t?.mint === config.mint &&
        t?.toUserAccount &&
        Number(t?.tokenAmount || 0) > 0
    )
    .sort(
      (a, b) =>
        Number(b?.tokenAmount || 0) - Number(a?.tokenAmount || 0)
    )[0];

  if (!received) return null;

  const buyer = received.toUserAccount;
  const native = Array.isArray(tx?.nativeTransfers) ? tx.nativeTransfers : [];

  const outLamports = native
    .filter(n => n?.fromUserAccount === buyer)
    .reduce((sum, n) => sum + Number(n?.amount || 0), 0);

  const inLamports = native
    .filter(n => n?.toUserAccount === buyer)
    .reduce((sum, n) => sum + Number(n?.amount || 0), 0);

  let solSpent = Math.max(
    0,
    (outLamports - inLamports) / LAMPORTS_PER_SOL
  );

  // Helius Enhanced often includes nativeBalanceChange in accountData.
  if (solSpent <= 0 && Array.isArray(tx?.accountData)) {
    const account = tx.accountData.find(a => a?.account === buyer);
    const change = Number(account?.nativeBalanceChange);

    if (Number.isFinite(change) && change < 0) {
      solSpent = Math.abs(change) / LAMPORTS_PER_SOL;
    }
  }

  if (solSpent < config.minBuySol) return null;

  return {
    buyer,
    tokens: Number(received.tokenAmount),
    solSpent,
    signature: tx?.signature || "",
    method: "enhanced"
  };
}

function parseFromRawBalances(tx) {
  // Accept both direct getTransaction payload and nested variants.
  const meta = tx?.meta || tx?.transaction?.meta;
  const transaction = tx?.transaction?.transaction || tx?.transaction;
  const msg = transaction?.message || tx?.message;

  if (!meta || !msg) return null;

  const accountKeys = getAccountKeys({
    ...tx,
    transaction: transaction,
    meta
  });

  if (!accountKeys.length) return null;

  const preTokenBalances = Array.isArray(meta.preTokenBalances)
    ? meta.preTokenBalances
    : [];

  const postTokenBalances = Array.isArray(meta.postTokenBalances)
    ? meta.postTokenBalances
    : [];

  const tokenMap = new Map();

  for (const b of preTokenBalances) {
    if (b?.mint !== config.mint) continue;

    const key = `${b.accountIndex}:${b.mint}`;
    tokenMap.set(key, {
      accountIndex: b.accountIndex,
      owner: b.owner || null,
      pre: Number(
        b?.uiTokenAmount?.uiAmountString ??
        b?.uiTokenAmount?.uiAmount ??
        0
      ),
      post: 0
    });
  }

  for (const b of postTokenBalances) {
    if (b?.mint !== config.mint) continue;

    const key = `${b.accountIndex}:${b.mint}`;
    const current = tokenMap.get(key) || {
      accountIndex: b.accountIndex,
      owner: b.owner || null,
      pre: 0,
      post: 0
    };

    current.owner = current.owner || b.owner || null;
    current.post = Number(
      b?.uiTokenAmount?.uiAmountString ??
      b?.uiTokenAmount?.uiAmount ??
      0
    );

    tokenMap.set(key, current);
  }

  const positiveChanges = [...tokenMap.values()]
    .map(x => ({
      ...x,
      change: x.post - x.pre
    }))
    .filter(x => x.change > 0)
    .sort((a, b) => b.change - a.change);

  if (!positiveChanges.length) return null;

  // The wallet receiving the largest positive BULLE balance change is
  // generally the buyer for a simple Pump.fun buy.
  const received = positiveChanges[0];

  const buyer =
    received.owner ||
    accountKeys[received.accountIndex] ||
    null;

  if (!buyer) return null;

  const preBalances = Array.isArray(meta.preBalances) ? meta.preBalances : [];
  const postBalances = Array.isArray(meta.postBalances) ? meta.postBalances : [];

  let solSpent = 0;

  const buyerIndex = accountKeys.findIndex(k => k === buyer);

  if (
    buyerIndex >= 0 &&
    Number.isFinite(Number(preBalances[buyerIndex])) &&
    Number.isFinite(Number(postBalances[buyerIndex]))
  ) {
    const changeLamports =
      Number(postBalances[buyerIndex]) - Number(preBalances[buyerIndex]);

    if (changeLamports < 0) {
      solSpent = Math.abs(changeLamports) / LAMPORTS_PER_SOL;
    }
  }

  // If buyer is represented by the token owner but not directly in accountKeys,
  // use accountData if available.
  if (solSpent <= 0 && Array.isArray(tx?.accountData)) {
    const account = tx.accountData.find(a => a?.account === buyer);
    const change = Number(account?.nativeBalanceChange);

    if (Number.isFinite(change) && change < 0) {
      solSpent = Math.abs(change) / LAMPORTS_PER_SOL;
    }
  }

  // As a final fallback, identify the largest SOL outflow among accounts.
  // This is useful for Pump.fun paths where the fee payer/buyer wallet is
  // not perfectly aligned with the token owner field.
  if (solSpent <= 0 && preBalances.length && postBalances.length) {
    let largestOutflow = 0;
    let largestOutflowAccount = null;

    for (let i = 0; i < Math.min(preBalances.length, postBalances.length); i++) {
      const change =
        Number(postBalances[i] || 0) - Number(preBalances[i] || 0);

      if (change < largestOutflow) {
        largestOutflow = change;
        largestOutflowAccount = accountKeys[i] || null;
      }
    }

    if (largestOutflow < 0) {
      solSpent = Math.abs(largestOutflow) / LAMPORTS_PER_SOL;

      // Prefer the actual SOL payer as buyer label if owner mapping was weak.
      if (largestOutflowAccount && !received.owner) {
        received.owner = largestOutflowAccount;
      }
    }
  }

  if (solSpent < config.minBuySol) return null;

  return {
    buyer: received.owner || buyer,
    tokens: Number(received.change),
    solSpent,
    signature:
      tx?.signature ||
      tx?.transaction?.signatures?.[0] ||
      transaction?.signatures?.[0] ||
      "",
    method: "raw-balances"
  };
}

export function parseBuy(tx) {
  if (!tx || tx.transactionError || tx?.meta?.err) return null;

  // 1) Fast path: Helius Enhanced fields
  const enhanced = parseFromEnhancedTransfers(tx);
  if (enhanced) return enhanced;

  // 2) Fallback: real Solana balance changes
  const raw = parseFromRawBalances(tx);
  if (raw) return raw;

  return null;
}
