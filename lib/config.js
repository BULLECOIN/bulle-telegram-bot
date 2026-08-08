export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  heliusApiKey: process.env.HELIUS_API_KEY,
  webhookSecret: process.env.HELIUS_WEBHOOK_SECRET,
  mint: process.env.TOKEN_MINT || "E8nFEtqiQZC1sQaTsRu6x5AnkZ2s2nqo1roWuBhJpump",
  symbol: process.env.TOKEN_SYMBOL || "BULLE",
  minBuySol: Number(process.env.MIN_BUY_SOL || "0.01")
};

export function assertConfig(...keys) {
  for (const key of keys) {
    if (!config[key]) throw new Error(`Missing environment variable for ${key}`);
  }
}
