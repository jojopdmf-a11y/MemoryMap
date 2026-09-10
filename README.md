# MemoryMap

Type the stops, drop a CSV of places and dates, an Excel workbook, or a Google Sheets link. This public preview maps the route, then lets you download a single HTML file for free.

The downloaded file has Leaflet, styles, and stop data baked in. It only needs the internet for map tiles.

Sign-in is optional. Anyone can create their own account with an email link or Google. Download is free. Paddle sandbox checkout is wired so credit packs can be tested; live charges are off.

## CSV columns

Flexible, case-insensitive headers:

- **date** / arrival: when the stop happened
- **place** / port / city, plus optional **state** and **country**
- **lat** / **lng** (optional): skip geocoding when both are present
- **title** / name / ship: marker label
- **notes**: popup text

Excel (`.xlsx`) and Google Sheets links work the same way. If the workbook has several tabs, you pick which one to plot. Apple Numbers needs an Excel or CSV export first.

A Google Sheet must be shared as “Anyone with the link can view,” or download it and drop the file.

On the landing page you can also type a trip label plus date, city or street address, state, and country for each stop. Suggestions appear as you type. The app turns that into the same CSV the rest of the flow uses.

Turn on **Road trip** under the map to follow driving roads instead of a straight line. Routing is fetched once (and baked into the souvenir). Zooming, panning, and Play do not request it again. If a leg cannot be traced — a cruise, for example — that segment stays a straight line.

See `public/caribbean-cruise.csv`, `public/european-train.csv`, and `public/la-to-nashville.csv` for mixed examples.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints, try a sample trip, and download a map. Download is free in this public preview. Locally, **Email me a link** shows the link on the page so you can test without sending mail. On a phone or tablet, Download opens the souvenir in a new browser tab. Tap Share or Copy link on that page to bookmark or send it — a file saved to Files or Downloads often will not play.

## Sign-in setup (one time)

People sign themselves in. You do not create users. Two accounts you open once, then the site uses them for everyone.

### Email links (Resend)

1. Create a [Resend](https://resend.com) account.
2. Verify the domain `memorymap.world`.
3. In Cloudflare → Workers → `memorymap` → Settings → Variables and Secrets, add:
   - `AUTH_SECRET` — a long random string, marked secret
   - `RESEND_API_KEY` — your Resend API key, marked secret
   - `RESEND_FROM` — `MemoryMap <hello@memorymap.world>` after the domain is verified

Until Resend is connected, the live **Email me a link** button will say email isn’t connected yet.

### Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an OAuth client ID of type **Web application**.
2. Authorized JavaScript origins:
   - `https://memorymap.world`
   - `https://www.memorymap.world`
   - `http://localhost:43123`
   - `http://127.0.0.1:43123`
3. Copy the client ID.
4. In Cloudflare → Workers → `memorymap` → Settings → Variables and Secrets, add `GOOGLE_CLIENT_ID` as a plain text variable (same value). No rebuild is required for this one.

Until that client ID is set, **Continue with Google** explains that email still works.

## Paddle sandbox (test checkout)

Paddle is the merchant of record. The catalog in sandbox already has MemoryMap credit packs ($2 / $5 / $10) plus the CougarCalc products from the other project, which share this sandbox account.

**Do not put the Paddle API key in git.** It belongs in:

- Local `.dev.vars` (gitignored): `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET`
- Cloudflare → Workers → `memorymap` → Settings → Variables and Secrets, both marked secret

The Paddle.js client token in `src/creditPacks.ts` is public on purpose (`test_…`). The secret API key never ships to the browser.

After sign-in, **Account → Paddle sandbox** opens overlay checkout. Download still does not spend credits.

### Cursor Paddle tools (same as the other chat)

This Cloud Agent session cannot attach MCP servers to itself. Desktop Cursor and **new** Cloud Agents pick them up from config:

1. **This repo:** `.cursor/mcp.json` talks to `https://sandbox-mcp.paddle.com/mcp` using `PADDLE_SANDBOX_API_KEY` in your environment.
2. **Desktop:** Cursor Settings → MCP Tools, or export `PADDLE_SANDBOX_API_KEY` then restart Cursor.
3. **Cloud Agents:** add the same remote MCP in [Cursor dashboard → Integrations & MCP](https://cursor.com/dashboard/integrations) (or the Cloud Agents MCP panel) with header `Authorization: Bearer <sandbox API key>`. A chat that started without that MCP will not grow the tools mid-run.

Paddle tools are `search` and `execute` against the Billing API (products, prices, transactions, webhooks).

### One-time Paddle dashboard steps

Checkout will not open until a default payment link exists. That setting is not available on the API key — it has to be saved in the Paddle dashboard. Overlay and hosted links both fail with “Something went wrong” until this is set.

1. Paddle sandbox → **Checkout → Checkout settings** → Default payment link → `https://memorymap.world/` (use `https://localhost/` if you are only testing this preview)
2. Add approved websites: `memorymap.world`, `www.memorymap.world`, `localhost`, `127.0.0.1`
3. Test with Paddle sandbox cards (for example `4242 4242 4242 4242`)

### Webhook

Sandbox destination: `https://memorymap.world/api/paddle/webhook` (`transaction.paid` / `completed` / `billed` / `updated`). The Worker verifies `Paddle-Signature` and records the grant. The browser also calls `/api/paddle/fulfill` after overlay checkout so credits appear without waiting on the webhook.

## Public preview

This is a public preview. Mapping and the souvenir file are free. Sign-in is optional. Paddle sandbox checkout is for testing credit packs. Live charges are off.

## How the live site updates

The live site is [memorymap.world](https://memorymap.world) (and [www.memorymap.world](https://www.memorymap.world)). Cloudflare is already connected to this GitHub repo. Both hostnames are attached to the Worker so the site should open with or without `www`.

**To update the website:** change the code, commit, and push to `main`. Cloudflare builds and publishes that commit. That’s it.

You do not need Wrangler on your laptop, and you do not need to reattach the domain. Watch the GitHub check named **Workers Builds: memorymap** — when it is green, the new version is live.

## Deploy (only if you are setting this up again)

```bash
npm ci
npm run build
npx wrangler deploy
```

`wrangler.toml` points Wrangler at `dist` and the Worker at `worker.ts`. Node 22 is in `.node-version`. The Worker name is `memorymap`. Custom domains `memorymap.world` and `www.memorymap.world` are already attached.

If Git deploy ever breaks, reconnect the repo in Cloudflare: Workers & Pages → `memorymap` → Settings → Builds.

After nameservers move off Porkbun, set up Cloudflare Email Routing if you want `hello@memorymap.world` forwarded. Porkbun forwarding will not keep working on Cloudflare DNS unless you copy the MX records.
