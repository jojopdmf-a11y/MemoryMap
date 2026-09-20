# MemoryMap — agent notes

Souvenir trip maps at [memorymap.world](https://memorymap.world). Vite 8 + React 19 + TypeScript, served by a Cloudflare Worker (`worker.ts`) with KV `SOUVENIRS`. This is a **website**, not a Mac app. There is no Python engine and no automated test suite yet.

Canonical product copy, CSV columns, sign-in, and Paddle dashboard steps live in `README.md`. Keep this file for how agents should build, test, and what not to touch.

## Run locally (Cloud Agent or laptop)

Node 22 (see `.node-version`). From the repo root:

```bash
npm ci
npm run dev
```

Vite binds **0.0.0.0:43123** (`strictPort`). Open that URL, pick a sample trip under `public/` (for example `caribbean-cruise.csv`), plot it, and use Play. Guest download stays free while Paddle is sandbox.

Local auth (`vite.auth.ts`) uses in-memory KV. **Email me a link** prints the magic link on the page (`ALLOW_DEV_LINKS` defaults to `1`). Do not require Resend, Google, or Paddle secrets to exercise mapping.

```bash
npm run lint          # oxlint
npx tsc -b            # typecheck
npm run build         # tsc -b && vite build → dist/
```

There are no `*.test.*` files. Do not invent a test runner. Production publish is **git push to `main`** on GitHub `jojopdmf-a11y/MemoryMap`; Cloudflare Workers Builds deploys. Do not run `wrangler deploy` unless git deploy is broken and the owner asked.

## Cloud vs laptop

| Do in a Cloud Agent | Do only when asked, usually on the owner’s machine or live dashboards |
| --- | --- |
| `npm ci`, `npm run dev` on 43123, lint, typecheck, build | Paddle **live** dashboard (payouts, live API keys, live webhook) |
| UI/CSS, Worker routes, souvenir HTML, OG cards | Switching `PADDLE_SANDBOX` off / live price IDs |
| Sample CSVs under `public/` | Posting to Instagram (owner’s Grok bots) |
| Preview copy while sandbox is on | Putting EIN, phone, or bank details on the site |

Do not look for Xcode targets, `.app` bundles, or a Python test tree. Those belong to a different project.

This session’s origin remote is the Cloud Agent git host. Also push `github` (`jojopdmf-a11y/MemoryMap`) when updating the live site. Stay on **`main`**. Do not open a pull request unless the owner asks.

## Product rules (do not regress)

- Public preview until the owner says go live. Keep `PREVIEW_NOTICE` in `src/site.ts` and `PADDLE_SANDBOX: true` in `src/creditPacks.ts` / `PADDLE_SANDBOX = "1"` in `wrangler.toml`.
- When go-live is explicit: live Paddle keys and price IDs, webhook, `PADDLE_SANDBOX` off, strip preview copy. Do not do that speculatively.
- Instagram is **@memorymapworld** (`src/site.ts`). Never invent another handle.
- Contact: `hello@memorymap.world`. Sole prop. EIN is for Paddle/tax only — never on the website.
- Secrets stay in `.dev.vars` (gitignored) or Cloudflare Worker secrets: `AUTH_SECRET`, `RESEND_*`, `FEEDBACK_TO`, `GOOGLE_CLIENT_ID`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`. The Paddle.js client token in `src/creditPacks.ts` is public (`test_…`).
- Paddle MCP (sandbox) is in `.cursor/mcp.json`. It needs `PADDLE_SANDBOX_API_KEY` in the agent environment; a chat that started without that MCP will not grow the tools mid-run.
- Phone layout: landing stacks the three panels under 900px; map page at 720px puts the map first (no overlapping topbar). Souvenir share URLs `/s/{32-hex}` must keep Open Graph tags and `/s/{id}/og.png`.
- Desktop landing is three above-the-fold panels (typed route, samples, spreadsheet). Keep it one viewport when possible; do not restore the old long single-column landing.

## Cursor Environment vs Project

A **Cloud Agent Environment** (install `npm ci`, optional snapshot) is what makes later agents boot with `node_modules` already present. Save it in the Cursor Environment panel after a proposed config is ready.

A **Project** is optional. It is a Cursor-app coordinator (shared chat, `AGENTS.md`, docs). It does not replace this repo or the Environment. Agents cannot create the Project; the owner starts it in the Cursor desktop app.
