import { CONTACT_EMAIL, CONTACT_MAILTO, PREVIEW_NOTICE } from '../site'

export function PreviewBanner() {
  return (
    <div className="preview-banner" role="status">
      <p>
        {PREVIEW_NOTICE}{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
      </p>
    </div>
  )
}
