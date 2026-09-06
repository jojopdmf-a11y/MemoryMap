# MemoryMap

Type the stops, drop a CSV of places and dates, an Excel workbook, or a Google Sheets link. Preview the route, then download a single HTML file that plays the trip on a map.

The downloaded file has Leaflet, styles, and stop data baked in. It only needs the internet for map tiles.

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

See `public/sample-trip.csv` for a mixed example.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints, try the sample trip, and download a map.

## Accounts and downloads

Preview and styling stay free and anonymous. Sign in (email link or Google) before you buy credits. A new souvenir costs 1 credit and saves the trip recipe on the account. Download the same map again for free. Change the trip or styling and the next file spends another credit.

Until a merchant of record is connected, buying a pack only adds credits in this browser (`localStorage`). Set `VITE_CHECKOUT_BASE_URL` for live checkout and `VITE_GOOGLE_CLIENT_ID` for Google sign-in.

## Deploy (memorymap.world)

The app is a static Vite build. Leave checkout and Google env vars unset for the preview launch.

```bash
npm ci
npm run build
```

Output is `dist`. Cloudflare’s current Git import creates a Worker (not classic Pages). Use:

- **Project name:** `memorymap`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Path:** `/`
- Let Cloudflare **create a new API token** (that is a Cloudflare token, not a GitHub token)
- Leave environment variables empty

`wrangler.toml` points Wrangler at `dist`. Node 22 is in `.node-version`.

Or deploy from a machine that is logged into Cloudflare:

```bash
npx wrangler deploy
```

`memorymap.world` is an apex domain, so it has to be a Cloudflare zone. Add the site in Cloudflare, switch the Porkbun nameservers to the two Cloudflare nameservers they show you, then attach `memorymap.world` and `www.memorymap.world` on the Worker’s Domains tab. Add the domain in Cloudflare *before* pointing DNS, or the host returns a 522.

After nameservers move off Porkbun, set up Cloudflare Email Routing if you want `hello@memorymap.world` forwarded. Porkbun forwarding will not keep working on Cloudflare DNS unless you copy the MX records.
