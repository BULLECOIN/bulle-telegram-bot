export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  heliusApiKey: process.env.HELIUS_API_KEY,
  webhookSecret: process.env.HELIUS_WEBHOOK_SECRET,

  mint: process.env.TOKEN_MINT || "E8nFEtqiQZC1sQaTsRu6x5AnkZ2s2nqo1roWuBhJpump",
  symbol: process.env.TOKEN_SYMBOL || "BULLE",
  tokenName: process.env.TOKEN_NAME || "BULLECOIN",

  website: process.env.WEBSITE_URL || "https://bullecoin.io",
  xUrl: process.env.X_URL || "https://x.com/BulleCoinOF",
  telegramUrl: process.env.TELEGRAM_URL || "",
  pumpUrl:
    process.env.PUMP_URL ||
    `https://pump.fun/coin/${process.env.TOKEN_MINT || "E8nFEtqiQZC1sQaTsRu6x5AnkZ2s2nqo1roWuBhJpump"}`,

  minBuySol: Number(process.env.MIN_BUY_SOL || "0.02"),
  brandImageUrl: process.env.BRAND_IMAGE_URL || ""
};
