import { CONTACT_EMAIL, CONTACT_MAILTO, SITE_NAME } from '../site'
import { SiteFooter } from './SiteFooter'

export function PrivacyPage() {
  return (
    <div className="app is-legal">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="kicker">
            <a href="/">{SITE_NAME}</a>
          </p>
          <p className="tagline">Visualize Your Voyages, Treasure Your Travels.</p>
        </div>
      </header>
      <main className="legal">
        <p className="legal-kicker">Legal</p>
        <h1>Privacy</h1>
        <p>
          {SITE_NAME} turns a list of places into a map you can preview and
          download. This page describes what happens to that information today.
        </p>

        <h2>What stays on your computer</h2>
        <p>
          The trip you type, drop, or load from a spreadsheet is processed in
          your browser. Sign-in, credits, and the recipes of maps you have
          already paid for are stored in this browser only (
          <code>localStorage</code>). Clearing the browser, switching computers,
          or using a private window removes them.
        </p>

        <h2>What we see</h2>
        <p>
          If you enter an email to sign in, that address is saved in this
          browser so the app can show your credits. We do not yet send sign-in
          mail from our servers. Card checkout is not live, so we do not collect
          payment details.
        </p>
        <p>
          If you write to{' '}
          <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>, we read that message in
          order to reply.
        </p>

        <h2>Lookups and map tiles</h2>
        <p>
          When a stop has a place name but no coordinates, the app asks
          OpenStreetMap Nominatim to find it. The map preview and the downloaded
          souvenir load map tiles from OpenStreetMap, Esri, or OpenTopoMap. Those
          services see the usual request data a map needs (the tile area, and
          typically your IP address).
        </p>

        <h2>The file you download</h2>
        <p>
          A souvenir is a single HTML file on your computer. It contains the
          trip you plotted. It is not stored on our servers. The file still
          needs the internet for map tiles.
        </p>

        <h2>Advertising</h2>
        <p>
          The site reserves space for later advertising. Those slots are empty
          and are not used to track you.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this page or your data:{' '}
          <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
        </p>
        <p className="legal-updated">Updated September 6, 2026.</p>
      </main>
      <SiteFooter />
    </div>
  )
}
