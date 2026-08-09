import { config } from "./config.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function parseBuy(tx) {
  if (!tx || tx.transactionError) return null;

  const transfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
  const received = transfers
    .filter(t => t.mint === config.mint && t.toUserAccount && Number(t.tokenAmount) > 0)
    .sort((a, b) => Number(b.tokenAmount) - Number(a.tokenAmount))[0];

  if (!received) return null;

  const buyer = received.toUserAccount;
  const native = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];

  const outLamports = native
    .filter(n => n.fromUserAccount === buyer)
    .reduce((s, n) => s + Number(n.amount || 0), 0);

  const inLamports = native
    .filter(n => n.toUserAccount === buyer)
    .reduce((s, n) => s + Number(n.amount || 0), 0);

  const solSpent = Math.max(0, (outLamports - inLamports) / LAMPORTS_PER_SOL);
  if (solSpent < config.minBuySol) return null;

  return {
    buyer,
    tokens: Number(received.tokenAmount),
    solSpent,
    signature: tx.signature || ""
  };
}
