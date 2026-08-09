export function usd(n, digits = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "N/A";
  if (Math.abs(x) >= 1_000_000_000) return `$${(x/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(x) >= 1_000_000) return `$${(x/1_000_000).toFixed(2)}M`;
  if (Math.abs(x) >= 1_000) return `$${(x/1_000).toFixed(2)}K`;
  if (Math.abs(x) >= 1) return `$${x.toFixed(digits)}`;
  return `$${x.toFixed(10).replace(/0+$/, "").replace(/\.$/, "")}`;
}

export function tokenAmount(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "N/A";
  if (Math.abs(x) >= 1_000_000_000) return `${(x/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(x) >= 1_000_000) return `${(x/1_000_000).toFixed(2)}M`;
  if (Math.abs(x) >= 1_000) return `${(x/1_000).toFixed(2)}K`;
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function shortWallet(w = "") {
  return w.length > 12 ? `${w.slice(0, 5)}...${w.slice(-5)}` : w;
}

export function signedPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "N/A";
  return `${x >= 0 ? "+" : ""}${x.toFixed(2)}%`;
}
