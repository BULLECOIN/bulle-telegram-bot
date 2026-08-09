import { config } from "../lib/config.js";

const DEFAULT_SIGNATURE =
  "2w4nnx5C4hZFYkJxXFuAqCy3rNRsrfkemUWipfqdpzFWg61eVmXFJqdGeKT7V8LE1FfqZVqqTyNTAjT6W7JVJmkG";

function lamportsToSol(n) {
  return Number(n || 0) / 1_000_000_000;
}

function summarizeTransaction(tx) {
  if (!tx) return { found: false };

  const msg = tx.transaction?.message || {};
  const meta = tx.meta || {};

  // Versioned and legacy transaction account keys can differ in shape.
  const staticKeys = Array.isArray(msg.accountKeys)
    ? msg.accountKeys.map(k => typeof k === "string" ? k : k?.pubkey).filter(Boolean)
    : [];

  const loadedWritable = meta.loadedAddresses?.writable || [];
  const loadedReadonly = meta.loadedAddresses?.readonly || [];
  const accountKeys = [...staticKeys, ...loadedWritable, ...loadedReadonly];

  const preBalances = meta.preBalances || [];
  const postBalances = meta.postBalances || [];

  const nativeBalanceChanges = accountKeys.map((account, i) => ({
    account,
    preLamports: preBalances[i] ?? null,
    postLamports: postBalances[i] ?? null,
    changeLamports:
      Number.isFinite(Number(preBalances[i])) && Number.isFinite(Number(postBalances[i]))
        ? Number(postBalances[i]) - Number(preBalances[i])
        : null,
    changeSol:
      Number.isFinite(Number(preBalances[i])) && Number.isFinite(Number(postBalances[i]))
        ? lamportsToSol(Number(postBalances[i]) - Number(preBalances[i]))
        : null
  }));

  const preTokenBalances = meta.preTokenBalances || [];
  const postTokenBalances = meta.postTokenBalances || [];

  const tokenKeys = new Map();

  for (const b of preTokenBalances) {
    const key = `${b.accountIndex}:${b.mint}`;
    tokenKeys.set(key, {
      accountIndex: b.accountIndex,
      account: accountKeys[b.accountIndex] || null,
      mint: b.mint,
      owner: b.owner || null,
      preUiAmount: Number(b.uiTokenAmount?.uiAmountString || b.uiTokenAmount?.uiAmount || 0),
      postUiAmount: 0
    });
  }

  for (const b of postTokenBalances) {
    const key = `${b.accountIndex}:${b.mint}`;
    const current = tokenKeys.get(key) || {
      accountIndex: b.accountIndex,
      account: accountKeys[b.accountIndex] || null,
      mint: b.mint,
      owner: b.owner || null,
      preUiAmount: 0,
      postUiAmount: 0
    };

    current.owner = current.owner || b.owner || null;
    current.postUiAmount = Number(
      b.uiTokenAmount?.uiAmountString || b.uiTokenAmount?.uiAmount || 0
    );
    tokenKeys.set(key, current);
  }

  const tokenBalanceChanges = [...tokenKeys.values()].map(x => ({
    ...x,
    change: x.postUiAmount - x.preUiAmount
  }));

  const bulleTokenChanges = tokenBalanceChanges.filter(
    x => x.mint === config.mint && Math.abs(x.change) > 0
  );

  const biggestSolOutflows = nativeBalanceChanges
    .filter(x => typeof x.changeSol === "number" && x.changeSol < 0)
    .sort((a, b) => a.changeSol - b.changeSol)
    .slice(0, 10);

  const biggestSolInflows = nativeBalanceChanges
    .filter(x => typeof x.changeSol === "number" && x.changeSol > 0)
    .sort((a, b) => b.changeSol - a.changeSol)
    .slice(0, 10);

  return {
    found: true,
    slot: tx.slot,
    blockTime: tx.blockTime,
    version: tx.version,
    feeLamports: meta.fee ?? null,
    feeSol: lamportsToSol(meta.fee || 0),
    err: meta.err,
    accountKeysCount: accountKeys.length,
    bulleMint: config.mint,
    bulleTokenChanges,
    biggestSolOutflows,
    biggestSolInflows,
    tokenBalanceChanges,
    logMessages: meta.logMessages || []
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  if (!config.heliusApiKey) {
    return res.status(500).json({ ok: false, error: "HELIUS_API_KEY is missing" });
  }

  const signature = String(req.query.signature || DEFAULT_SIGNATURE).trim();

  try {
    const rpc = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(config.heliusApiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "bulle-debug-tx",
          method: "getTransaction",
          params: [
            signature,
            {
              encoding: "jsonParsed",
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0
            }
          ]
        })
      }
    );

    const json = await rpc.json();

    if (json.error) {
      return res.status(500).json({
        ok: false,
        signature,
        rpcError: json.error
      });
    }

    return res.status(200).json({
      ok: true,
      signature,
      configuredMint: config.mint,
      analysis: summarizeTransaction(json.result)
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      signature,
      error: String(err)
    });
  }
}
