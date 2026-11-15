# Mike's Pull List

A single-user comic pull list built with SvelteKit and TypeScript, styled after the dark theme of svelte.dev/docs.

- **Pull List** – this week plus four future weeks, each with notes, cover cards, a tax-inclusive total and a Pullbox price (10% off before tax).
- **Search** – every publisher and every future solicitation (via [Metron](https://metron.cloud)). Pull a single issue, subscribe to a series, or pull any variant cover.
- **Notes** – text notes attached to any week, including future weeks; they show above that week's pull list.
- **Settings** – tax rate (default 6%).

Pulls and subscription releases are kept for 30 days after their release date, then dropped.

## Setup

Requires Node 20.6+.

```sh
npm install
npm run setup:auth     # prompts for username/password, writes .env with a scrypt hash + session secret
```

Get a free API token from your Metron account and put it in `.env` as `METRON_API_TOKEN`. Without it, searching and release lookups are disabled.

Credentials are never stored in plain text: `.env` holds only a salted scrypt hash and a random cookie-signing secret. To change the login, run `npm run setup:auth` again. `.env` is git-ignored.

```sh
npm run build
npm start              # http://localhost:3000
```

Data lives in `data/store.json` (override with `DATA_DIR`).

## Access from anywhere

Keep the app bound to your PC and publish it through a tunnel rather than opening router ports, for example Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:3000`) or Tailscale Funnel. The tunnel provides HTTPS; the session cookie is marked `Secure` automatically over HTTPS. When behind a tunnel or proxy, set `ADDRESS_HEADER=x-forwarded-for` (and `XFF_DEPTH=1`) in `.env` so login throttling sees real client addresses.

## Notes on Metron limits

Metron allows about 20 requests/minute. The server queues and paces requests, caches search results for 10 minutes, and fills in publisher/price for pulled issues in the background, so those fields can appear a few seconds after pulling.

## Development

```sh
npm run dev
npm run check
npm test
```
