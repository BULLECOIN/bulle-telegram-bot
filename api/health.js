export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: "BULLE Telegram Bot",
    version: "2.0.0",
    features: [
      "tiered buy alerts",
      "/price",
      "/market",
      "/holders",
      "/stats",
      "/buy",
      "/ca"
    ]
  });
}
