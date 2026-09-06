import { CONTACT_EMAIL, CONTACT_MAILTO } from '../site'

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
      <span aria-hidden="true">·</span>
      <a href="/privacy">Privacy</a>
    </footer>
  )
}
