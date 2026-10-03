import { CONTACT_EMAIL, CONTACT_MAILTO, SITE_NAME } from '../site'
import { LegalShell } from './LegalShell'

export function TermsPage() {
  return (
    <LegalShell kicker="Public preview" title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) explain how you may use {SITE_NAME} at
        memorymap.world. {SITE_NAME} is a small sole-proprietorship product. By
        using the site, you agree to these Terms. If you do not agree, please do
        not use the service.
      </p>
      <p>
        {SITE_NAME} is currently a <strong>public preview</strong>. Mapping,
        Play, and guest download are free. Live card charges are off until the
        owner turns them on. Preview features may change.
      </p>

      <h2>The service</h2>
      <p>
        {SITE_NAME} helps you plot trip stops from typed places, CSV or Excel
        files, or a Google Sheets link, preview a map, play through the route,
        and keep a souvenir HTML map. Optional sign-in lets you save maps to an
        account and use credits. The service is provided as a website; there is
        no separate app store product covered by these Terms.
      </p>

      <h2>Accounts</h2>
      <p>
        You may create an account with an email magic link or Google sign-in. We
        do not create accounts for you by hand. You are responsible for the
        email address you use and for activity under your signed-in session. Do
        not share a signed-in browser if you want the account kept private. You
        may sign out at any time.
      </p>

      <h2>Credits, payments, and refunds</h2>
      <p>
        During this public preview, signed-in people may receive preview credits
        at no charge. Keeping a new souvenir on your account typically spends 1
        credit. Guest download remains free while the preview and Paddle sandbox
        stay on.
      </p>
      <p>
        When paid credit packs are offered for real money,{' '}
        <strong>Paddle is the Merchant of Record</strong>. That means Paddle
        handles checkout, invoices, and card processing. Card and payment data
        go to Paddle, not to {SITE_NAME}. {SITE_NAME} only receives what it
        needs to credit your account (for example, that a purchase completed and
        how many credits to add).
      </p>
      <p>
        Until the owner flips the site from sandbox/preview to live payments,
        checkout is for testing only and <strong>does not create live
        charges</strong>. After live payments are on, questions about a
        purchase, invoice, or refund should start at{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. We will work with you and,
        where needed, with Paddle. Refunds for digital credit packs are handled
        case by case; unused credits from a clearly mistaken or failed purchase
        are the usual starting point. Nothing here promises a refund in every
        situation.
      </p>

      <h2>Souvenirs and share links</h2>
      <p>
        A souvenir is an HTML trip map you download or keep. On phones and
        tablets, {SITE_NAME} may also host a copy at a private link such as{' '}
        <code>/s/&#123;id&#125;</code> so the map can open in a browser tab.
        Anyone with that link can usually open the souvenir. Treat share URLs
        like secrets if the trip is personal. Hosted copies may expire or be
        removed after the retention period described on the Privacy page, or
        sooner if needed for abuse, legal, or operational reasons.
      </p>

      <h2>Your content and photos</h2>
      <p>
        You keep rights in the trip data, notes, and photo links you provide. By
        uploading or linking content, you grant {SITE_NAME} a limited permission
        to process and display it so the map and souvenir can work (including
        fetching, resizing, and embedding photos you link).
      </p>
      <p>
        <strong>You are responsible for photos and other media you attach.</strong>{' '}
        Only use images you have the right to use, and that you are allowed to
        share. Do not upload or link illegal content, or content that infringes
        someone else’s rights. {SITE_NAME} does not review every photo or stop
        for rights clearance.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use the service for unlawful purposes, or to harass, scam, or harm
          others
        </li>
        <li>
          Probe, scrape at abusive volume, overload, or attempt unauthorized
          access to accounts, systems, or data
        </li>
        <li>
          Interfere with other people’s use, or reverse engineer the service
          except where the law allows
        </li>
        <li>
          Misrepresent affiliation with {SITE_NAME}, or use the service to
          distribute malware
        </li>
        <li>
          Circumvent credit, sign-in, or payment controls, or create accounts
          only to abuse preview grants
        </li>
      </ul>
      <p>
        We may suspend or limit access if we reasonably believe these Terms are
        being broken, or if needed to protect the service or other users.
      </p>

      <h2>Third-party services</h2>
      <p>
        Mapping, geocoding, routing, map tiles, email delivery, Google sign-in,
        and payments depend on third-party services. Their terms and
        availability apply. {SITE_NAME} is not responsible for outages or
        changes those providers make.
      </p>

      <h2>“As is” disclaimer</h2>
      <p>
        The service is provided <strong>as is</strong> and <strong>as
        available</strong>. To the fullest extent allowed by law, {SITE_NAME}{' '}
        disclaims warranties of merchantability, fitness for a particular
        purpose, and non-infringement. We do not promise uninterrupted service,
        perfect geocoding, complete road traces, or that every souvenir will
        work offline on every device.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent allowed by law, {SITE_NAME} and its owner are not
        liable for indirect, incidental, special, consequential, or punitive
        damages, or for lost profits, data, or goodwill, arising from your use
        of the service. Our total liability for claims relating to the service
        is limited to the greater of (a) the amount you paid to {SITE_NAME} for
        credits in the three months before the claim, or (b) twenty-five U.S.
        dollars (US$25). Some places do not allow certain limits; in those
        places, the limit is the maximum the law allows.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms as the product changes. The “Updated” date
        below will change when we do. Continued use after an update means you
        accept the revised Terms. If a change is material and you have an
        account, we will try to note it in a reasonable way (for example on this
        page or via the preview notice).
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the United States, without
        deciding conflict-of-law rules that would point elsewhere. Courts with
        jurisdiction over the owner may hear disputes, except where applicable
        law requires otherwise for consumers.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{' '}
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
        <a href="/privacy">Privacy Policy</a>.
      </p>
      <p className="legal-updated">Updated October 3, 2026.</p>
    </LegalShell>
  )
}
