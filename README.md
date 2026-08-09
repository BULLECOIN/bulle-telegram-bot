# BULLE Telegram Bot v2

Custom Telegram tracker for BULLECOIN.

## Personality

Buy alerts change automatically by SOL size:

- 0.02–0.19 SOL → 🟢 NEW BULL JOINED
- 0.20–0.74 SOL → ⚡ STAMPEDE ALERT
- 0.75–1.99 SOL → 🔥 BIG BULL BUY
- 2.00–4.99 SOL → 🐋🔥 WHALE BULL BUY
- 5.00+ SOL → 🚨🚨 MEGA STAMPEDE

Edit these levels in `lib/branding.js`.

## Commands

- `/price` or `/market` — price, MC, liquidity, volume, 24h change, buys vs sells and a market-status message
- `/holders` — unique token owners, top-5 concentration and largest tracked wallets
- `/stats` — combined Stampede Report
- `/buy` — Pump.fun button + official CA
- `/ca` — official CA

## Required Vercel environment variables

Copy names from `.env.example`. Never commit real secrets.

## Telegram webhook

After deployment:

`https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/telegram`

Then POST once to:

`https://YOUR_DOMAIN/api/setup`

This registers the slash-command menu.

## Helius webhook

Use:

`https://YOUR_DOMAIN/api/helius?secret=YOUR_HELIUS_WEBHOOK_SECRET`

Watch the BULLE token mint on Solana Mainnet. This MVP expects Helius enhanced
transaction payloads containing `tokenTransfers` and `nativeTransfers`.

## Important holder note

Largest token owners can include liquidity, bonding-curve or program-controlled
accounts. The bot explicitly labels these as tracked wallets and avoids claiming
they are necessarily individual retail holders.
