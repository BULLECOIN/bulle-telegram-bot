import { config } from "../lib/config.js";
import { telegram } from "../lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      note: "POST to this endpoint after deployment to register BULLE bot commands."
    });
  }

  try {
    const commands = [
      { command: "price", description: "Live BULLE price & market" },
      { command: "holders", description: "Holder count & distribution" },
      { command: "stats", description: "Full Stampede Report" },
      { command: "buy", description: "Official Pump.fun buy link" },
      { command: "ca", description: "Official BULLE contract address" }
    ];

    const result = await telegram("setMyCommands", { commands });
    res.status(200).json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
