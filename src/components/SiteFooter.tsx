import { CONTACT_EMAIL, CONTACT_MAILTO } from '../site'

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <span>Preview</span>
      <span aria-hidden="true">·</span>
      <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
      <span aria-hidden="true">·</span>
      <a href="/guides/">Guides</a>
      <span aria-hidden="true">·</span>
      <a href="/privacy">Privacy</a>
    </footer>
  )
}
