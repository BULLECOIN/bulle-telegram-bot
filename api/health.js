export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: "BULLE Telegram Bot",
    features: ["buy alerts", "/price", "/mc", "/holders", "/stats"]
  });
}
