# WatDesk anonymous usage counter

A tiny Cloudflare Worker that counts how many WatDesk installs were used each day. It stores one random install ID per
day and nothing else (no IP address, course, grade or account data). WatDesk only talks to it when a user turns on
**Settings → Anonymous usage count**, which is off by default.

## Set it up (about 10 minutes, free tier is enough)

1. `cd stats-worker && npx wrangler login`
2. `npx wrangler kv namespace create STATS`, then paste the printed `id` into `wrangler.toml`.
3. `npx wrangler secret put STATS_TOKEN` and enter a long random string; it protects `/summary`.
4. `npx wrangler deploy`, which prints your URL, e.g. `https://watdesk-stats.<you>.workers.dev`.
5. In the repo root run `node tools/set-stats-endpoint.mjs https://watdesk-stats.<you>.workers.dev/ping`. It sets the
   URL in `src/core/stats.ts` and allows that origin in the extension's `connect-src`.
6. Update the privacy text on the Edge Add-ons listing (see `PRIVACY.md`, "Optional anonymous usage count"), then build
   and release as usual.

## Read the numbers

```sh
curl -s -H "Authorization: Bearer $STATS_TOKEN" https://watdesk-stats.<you>.workers.dev/summary
```

Returns `today`, `activeLast30Days`, today's version breakdown and a per-day history.

## Limits

- Anyone can send random IDs, so treat the number as an estimate, not an audit. Edge Partner Center remains the source
  of truth for store installs.
- IDs are deleted from the extension when a user turns the option off, and expire from KV after 400 days.
