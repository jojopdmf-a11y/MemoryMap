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
          <a className="ghost" href="/guides/">
            Guides
          </a>
          <AccountMenu />
        </div>
      </header>
      <main className="legal">
        <p className="legal-kicker">Public preview</p>
        <h1>Privacy</h1>
        <p>
          {SITE_NAME} is a public preview. Mapping and Play are free. Keeping
          the souvenir file uses 1 credit. Sign-in is required to keep a file.
          During this preview, signed-in people can add credits at no charge.
          Live card charges are off. This page describes what happens to that
          information today.
        </p>

        <h2>What stays on your computer</h2>
        <p>
          The trip you type, drop, or load from a spreadsheet is edited in your
          browser. Clearing the browser, switching computers, or using a private
          window removes the unsaved trip. We do not store the working spreadsheet
          on our servers.
        </p>

        <h2>Sign-in</h2>
        <p>
          You can create an account yourself with an email link or Google. We
          do not create accounts by hand. Email sign-in sends a one-time link
          to the address you type. Google shares your email with us when you
          continue with Google. After you sign in, we set an HttpOnly cookie so
          this browser stays signed in for up to 90 days.
        </p>

        <h2>Credits and saved maps</h2>
        <p>
          Credits and the list of maps you have kept are stored on our servers,
          keyed by the email you signed in with. That way a new computer or a
          cleared browser can still see your balance after you sign in again.
          Trip editing stays in the browser until you keep a file.
        </p>

        <h2>Feedback</h2>
        <p>
          On the map page you can send a note with Feedback or suggestions. That
          message is emailed to{' '}
          <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. If you include an email
          address, we may use it to reply. You can also write that address
          directly.
        </p>

        <h2>Payments</h2>
        <p>
          Preview does not require a card. During this public preview, signed-in
          people can add credits to their account at no charge. Those credits
          still live on our servers, keyed by email, and keeping a new map uses
          one of them. When live charges are on, credit packs will be sold
          through Paddle, our merchant of record. Card details go to Paddle, not
          to MemoryMap.
        </p>
        <p>
          If you write to{' '}
          <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>, we read that message in
          order to reply.
        </p>

        <h2>Lookups and map tiles</h2>
        <p>
          When you type a place, city names go to Open-Meteo and Photon
          (Komoot). Street addresses also go to OpenStreetMap Nominatim so
          house numbers like “6828 W Cougar Ave” can resolve. The map preview
          and the downloaded souvenir load map tiles from Esri or OpenTopoMap.
        </p>
        <p>
          Turning on Road trip sends the stop coordinates to the public OSRM
          driving router so the line can follow roads. We cache suggestions and
          road traces so zooming, playing, and downloading do not keep asking.
          Those services typically see your IP address and the query.
        </p>

        <h2>The file you keep</h2>
        <p>
          Keeping a souvenir spends 1 credit unless that exact trip and style
          is already on your account. The file is a single HTML document on your
          computer. It contains the trip you plotted. The file still needs the
          internet for map tiles. On phones and tablets, a file saved to
          Downloads often cannot run, so we also keep a copy for a year at a
          private memorymap.world link and open that in a new tab. Share or copy
          that link to bookmark the map.
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
        <p className="legal-updated">Updated September 11, 2026.</p>
      </main>
      <SiteFooter />
    </div>
  )
}
