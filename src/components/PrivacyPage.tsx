import { CONTACT_EMAIL, CONTACT_MAILTO, SITE_NAME } from '../site'
import { AccountMenu } from './AccountMenu'
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
        <div className="topbar-tools">
          <AccountMenu />
        </div>
      </header>
      <main className="legal">
        <p className="legal-kicker">Public preview</p>
        <h1>Privacy</h1>
        <p>
          {SITE_NAME} is a public preview. It turns a list of places into a map
          you can preview, then download as a souvenir file for free. Sign-in
          is optional. Paid credits are not for sale yet. This page describes
          what happens to that information today.
        </p>

        <h2>What stays on your computer</h2>
        <p>
          The trip you type, drop, or load from a spreadsheet is processed in
          your browser. Nothing from that trip is stored on our servers. Clearing
          the browser, switching computers, or using a private window removes it.
        </p>

        <h2>Sign-in</h2>
        <p>
          You can create an account yourself with an email link or Google. We
          do not create accounts by hand. Email sign-in sends a one-time link
          to the address you type. Google shares your email with us when you
          continue with Google. This public preview keeps the signed-in session
          and maps you download while signed in in this browser.
        </p>

        <h2>Feedback</h2>
        <p>
          On the map page you can send a note with Feedback or suggestions. That
          message is emailed to{' '}
          <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. If you include an email
          address, we may use it to reply. You can also write that address
          directly.
        </p>

        <h2>What we see</h2>
        <p>
          This public preview does not sell credits. We do not collect payment
          details.
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
          Download is free in this public preview. A souvenir is a single HTML
          file on your computer. It contains the trip you plotted. It is not
          stored on our servers. The file still needs the internet for map tiles.
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
        <p className="legal-updated">Updated September 8, 2026.</p>
      </main>
      <SiteFooter />
    </div>
  )
}

