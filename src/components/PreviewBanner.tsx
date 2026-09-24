import { useAccount } from '../accountStore'
import { openChrome } from '../chrome'
import { PADDLE_SANDBOX } from '../commerce'
import { CONTACT_EMAIL, CONTACT_MAILTO, PREVIEW_NOTICE } from '../site'

export function PreviewBanner() {
  const { account } = useAccount()

  if (PADDLE_SANDBOX && !account) {
    return (
      <div className="preview-banner preview-banner-launch" role="status">
        <p>
          Preview special: create a free account now and get 5 free map
          downloads when MemoryMap launches. Share your maps and earn up to 10
          more.
        </p>
        <button
          type="button"
          className="preview-banner-cta"
          onClick={() => {
            openChrome('account')
            claimAccountFocus()
          }}
        >
          Create free account
        </button>
      </div>
    )
  }

  return (
    <div className="preview-banner" role="status">
      <p>
        {PREVIEW_NOTICE}{' '}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
      </p>
    </div>
  )
}

function claimAccountFocus() {
  window.setTimeout(() => {
    const chip = document.querySelector<HTMLButtonElement>('.account-chip')
    chip?.focus()
  }, 0)
}
