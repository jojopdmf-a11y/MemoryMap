# MemoryMap

Type the stops, drop a CSV of places and dates, an Excel workbook, or a Google Sheets link. This public preview maps the route, then lets you download a single HTML file for free.

The downloaded file has Leaflet, styles, and stop data baked in. It only needs the internet for map tiles.

Sign-in is optional. Anyone can create their own account with an email link or Google. Paid credits are not for sale yet.

## CSV columns

Flexible, case-insensitive headers:

- **date** / arrival: when the stop happened
- **place** / port / city, plus optional **state** and **country**
- **lat** / **lng** (optional): skip geocoding when both are present
- **title** / name / ship: marker label
- **notes**: popup text

Excel (`.xlsx`) and Google Sheets links work the same way. If the workbook has several tabs, you pick which one to plot. Apple Numbers needs an Excel or CSV export first.

A Google Sheet must be shared as “Anyone with the link can view,” or download it and drop the file.

On the landing page you can also type a trip label plus date, city, state, and country for each stop. The app turns that into the same CSV the rest of the flow uses.

See `public/caribbean-cruise.csv`, `public/european-train.csv`, and `public/la-to-nashville.csv` for mixed examples.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints, try a sample trip, and download a map. Download is free in this public preview. Locally, **Email me a link** shows the link on the page so you can test without sending mail.

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

## Public preview

This is a public preview. Mapping and the souvenir file are free. Sign-in is optional. Paid credits are not for sale yet.

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
