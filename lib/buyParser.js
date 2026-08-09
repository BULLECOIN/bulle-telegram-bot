import { config } from "./config.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function parseBuy(tx) {
  console.log("=== BULLE TX DEBUG START ===");

  console.log(JSON.stringify({
    type: tx?.type,
    source: tx?.source,
    signature: tx?.signature,
    feePayer: tx?.feePayer,
    description: tx?.description,
    tokenTransfersCount: Array.isArray(tx?.tokenTransfers) ? tx.tokenTransfers.length : 0,
    nativeTransfersCount: Array.isArray(tx?.nativeTransfers) ? tx.nativeTransfers.length : 0,
    accountDataCount: Array.isArray(tx?.accountData) ? tx.accountData.length : 0
  }, null, 2));

  console.log("Configured mint:", config.mint);
  console.log("Configured MIN_BUY_SOL:", config.minBuySol);

  if (!tx) {
    console.log("BULLE PARSER: empty transaction");
    return null;
  }

  if (tx.transactionError) {
    console.log("BULLE PARSER: transactionError present");
    return null;
  }

  const transfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];

  const mintTransfers = transfers.filter(t => t?.mint === config.mint);

  console.log("Mint transfers found:", mintTransfers.length);
  console.log("Mint transfer details:", JSON.stringify(mintTransfers, null, 2));

  const receivedCandidates = mintTransfers
    .filter(t => t?.toUserAccount && Number(t?.tokenAmount || 0) > 0)
    .sort((a, b) => Number(b?.tokenAmount || 0) - Number(a?.tokenAmount || 0));

  if (!receivedCandidates.length) {
    console.log("BULLE TX RECEIVED - NOT PARSED AS BUY: no inbound token transfer");
    console.log("=== BULLE TX DEBUG END ===");
    return null;
  }

  const received = receivedCandidates[0];
  const buyer = received.toUserAccount;

  const native = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];

  const outLamports = native
    .filter(n => n?.fromUserAccount === buyer)
    .reduce((s, n) => s + Number(n?.amount || 0), 0);

  const inLamports = native
    .filter(n => n?.toUserAccount === buyer)
    .reduce((s, n) => s + Number(n?.amount || 0), 0);

  let solSpent = Math.max(0, (outLamports - inLamports) / LAMPORTS_PER_SOL);

  console.log("Buyer candidate:", buyer);
  console.log("Token amount:", received.tokenAmount);
  console.log("Native out SOL:", outLamports / LAMPORTS_PER_SOL);
  console.log("Native in SOL:", inLamports / LAMPORTS_PER_SOL);
  console.log("Net SOL from nativeTransfers:", solSpent);

  if (solSpent <= 0 && Array.isArray(tx.accountData)) {
    const buyerAccount = tx.accountData.find(a => a?.account === buyer);

    if (buyerAccount && Number.isFinite(Number(buyerAccount.nativeBalanceChange))) {
      const changeLamports = Number(buyerAccount.nativeBalanceChange);

      if (changeLamports < 0) {
        solSpent = Math.abs(changeLamports) / LAMPORTS_PER_SOL;
        console.log("Fallback SOL from nativeBalanceChange:", solSpent);
      }
    }
  }

  if (solSpent < config.minBuySol) {
    console.log(
      `BULLE TX RECEIVED - NOT PARSED AS BUY: solSpent=${solSpent}, min=${config.minBuySol}`
    );
    console.log("=== BULLE TX DEBUG END ===");
    return null;
  }

  const result = {
    buyer,
    tokens: Number(received.tokenAmount),
    solSpent,
    signature: tx.signature || ""
  };

  console.log("BULLE BUY PARSED SUCCESSFULLY:", JSON.stringify(result));
  console.log("=== BULLE TX DEBUG END ===");

  return result;
}
