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
