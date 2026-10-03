import { CONTACT_EMAIL, CONTACT_MAILTO, SITE_NAME } from '../site'
import { LegalShell } from './LegalShell'

export function PrivacyPage() {
  return (
    <LegalShell kicker="Public preview" title="Privacy Policy">
      <p>
        This Privacy Policy describes what {SITE_NAME} (memorymap.world)
        collects and how that information is used. {SITE_NAME} is a small
        sole-proprietorship product. Contact:{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
      </p>
      <p>
        {SITE_NAME} is a <strong>public preview</strong>. Mapping, Play, and
        guest download are free. Sign in only if you want a map saved on your
        account. Live card charges are off. When paid credits go live, this
        page still applies; the Payments section explains Paddle’s role.
      </p>

      <h2>What stays on your computer</h2>
      <p>
        The trip you type, drop, or load from a spreadsheet is edited in your
        browser. Clearing the browser, switching computers, or using a private
        window removes the unsaved trip. We do not store the working spreadsheet
        on our servers unless you keep a souvenir or save a map to your account.
      </p>

      <h2>Accounts and sign-in</h2>
      <p>
        You can create an account with an email link or Google. We do not create
        accounts by hand. Email sign-in sends a one-time link to the address you
        type. Google shares your email with us when you continue with Google.
        After you sign in, we set an HttpOnly session cookie so this browser
        stays signed in for up to 90 days. We use that cookie only to recognize
        your session—not for advertising.
      </p>

      <h2>Credits and saved maps</h2>
      <p>
        Credits and the list of maps you have kept are stored on our servers,
        keyed by the email you signed in with. That way a new computer or a
        cleared browser can still see your balance after you sign in again. Trip
        editing stays in the browser until you keep a file. During preview,
        signed-in people may receive free preview credits; when live payments
        are on, purchased packs add to the same ledger.
      </p>

      <h2>Souvenirs and share links</h2>
      <p>
        During this public preview, you can download a souvenir without signing
        in. That file stays on your computer. If you are signed in, keeping a
        souvenir on your account spends 1 credit unless that exact trip and
        style is already saved. The file is a single HTML document. It contains
        the trip you plotted and still needs the internet for map tiles.
      </p>
      <p>
        On phones and tablets, a file saved to Downloads often cannot run, so we
        may also keep a copy for about a year at a private memorymap.world link
        such as <code>/s/&#123;id&#125;</code> and open that in a new tab. Anyone
        with the link can open the map. Share or copy that link only if you are
        comfortable with that. Open Graph preview images for those links may be
        generated so the URL can show a simple card when shared.
      </p>

      <h2>Photos and media you link</h2>
      <p>
        Optional photo fields can include a public https link to an image. We
        may fetch and resize that image so Play and the souvenir can show it.
        <strong> You are responsible for having the rights to use and share
        those images.</strong> Do not link photos you are not allowed to use.
        We do not independently clear image rights for you.
      </p>

      <h2>Feedback</h2>
      <p>
        On the map page you can send a note with Feedback or suggestions. That
        message is emailed to{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. If you include an email
        address, we may use it to reply. You can also write that address
        directly. Signed-in accounts may also see a copy of notes under Account
        when that feature is available.
      </p>

      <h2>Payments</h2>
      <p>
        Preview does not require a card. During this public preview, signed-in
        people can add credits to their account at no charge (and may use
        Paddle’s sandbox to test checkout). Those credits live on our servers,
        keyed by email. Keeping a new map uses one of them.
      </p>
      <p>
        When live charges are on, credit packs are sold through{' '}
        <strong>Paddle, our Merchant of Record</strong>. Card and payment details
        go to Paddle, not to {SITE_NAME}. Paddle’s privacy materials apply to
        payment processing. We receive purchase events needed to add credits to
        your account. Billing or refund questions: start at{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. Until sandbox/preview is
        flipped off, there are no live charges.
      </p>

      <h2>Lookups and map tiles</h2>
      <p>
        When you type a place, city names go to Open-Meteo and Photon (Komoot).
        Street addresses also go to OpenStreetMap Nominatim so house numbers
        can resolve. The map preview and the downloaded souvenir load map tiles
        from Esri or OpenTopoMap.
      </p>
      <p>
        Turning on Road trip sends the stop coordinates to the public OSRM
        driving router so the line can follow roads. We cache suggestions and
        road traces so zooming, playing, and downloading do not keep asking.
        Those services typically see your IP address and the query.
      </p>

      <h2>Cookies and similar technology</h2>
      <p>
        Essential cookies: the signed-in session cookie described above. We do
        not use third-party advertising cookies today. The site reserves empty
        ad slots for later; those slots are not used to track you now. If that
        changes, this page will be updated.
      </p>

      <h2>Advertising</h2>
      <p>
        The site reserves space for later advertising. Those slots are empty
        and are not used to track you.
      </p>

      <h2>How long we keep information</h2>
      <p>
        Account records (email, credit balance, saved-map list) stay while the
        account is active. Session cookies last up to 90 days unless you sign
        out. Hosted souvenir links are intended for about a year unless removed
        earlier. Feedback emails are kept as ordinary correspondence. We may
        delete or anonymize data sooner if you ask and we can do so without
        breaking legal or security obligations.
      </p>

      <h2>Your choices</h2>
      <p>
        You can sign out, stop using the site, or write to{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a> to ask about your account
        data or a hosted souvenir link. We will respond in a reasonable time.
        Guest trips that never left your browser are already under your control.
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is not directed at children under 13, and we do not
        knowingly collect personal information from them. If you believe a child
        provided an email for an account, contact us and we will delete it.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this Privacy Policy as the product changes. The “Updated”
        date below will change when we do. Continued use after an update means
        you accept the revised policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this page or your data:{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. Instagram:{' '}
        <a
          href="https://www.instagram.com/memorymapworld/"
          target="_blank"
          rel="noreferrer"
        >
          @memorymapworld
        </a>
        .
      </p>
      <p>
        Related:{' '}
        <a href="/terms">Terms of Service</a>.
      </p>
      <p className="legal-updated">Updated October 3, 2026.</p>
    </LegalShell>
  )
}
