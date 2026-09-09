import { useEffect, useId, useRef, useState } from 'react'
import {
  completeFreeRedownload,
  formatWhen,
  setAccountNotice,
  signOut,
  useAccount,
} from '../accountStore'
import { saveSouvenir } from '../download'
import { buildSouvenirHtml } from '../souvenir'
import { claimChrome, onChromeClaim } from '../chrome'
import { SignInForm } from './SignInForm'

export function AccountMenu() {
  const { account, notice } = useAccount()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => onChromeClaim('account', () => setOpen(false)), [])

  useEffect(() => {
    if (!open) return
    claimChrome('account')
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function downloadAgain(id: string) {
    setError(null)
    try {
      const item = completeFreeRedownload(id)
      await saveSouvenir(item.filename, (hosted) =>
        buildSouvenirHtml(
          item.recipe.title,
          item.recipe.stops,
          item.recipe.look,
          hosted,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download that map.')
    }
  }

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-chip"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() =>
          setOpen((current) => {
            const next = !current
            if (next) claimChrome('account')
            return next
          })
        }
      >
        <span className="account-who">{account ? account.email : 'Sign in'}</span>
        <span className="account-credits">
          {account
            ? `${account.library.length} saved map${account.library.length === 1 ? '' : 's'}`
            : 'Email or Google'}
        </span>
      </button>
      {open && (
        <div className="account-panel" id={panelId} role="dialog" aria-label="Account">
          <p className="kicker">Account</p>
          <h2>{account ? 'Your account' : 'Create your account'}</h2>
          {notice && (
            <p className="hint" role="status">
              {notice}
            </p>
          )}
          {account ? (
            <>
              <p className="account-balance">{account.email}</p>
              <p className="hint">
                Signed in {formatWhen(account.createdAt) || 'today'}. Download is
                free. Maps you download while signed in are listed here and stay
                in this browser.
              </p>
              <div className="history-block">
                <p className="kicker">Downloads</p>
                {account.library.length === 0 ? (
                  <p className="hint">
                    No saved maps yet. Download a souvenir while signed in and it
                    will show up here so you can get it again.
                  </p>
                ) : (
                  <ul className="history-list">
                    {account.library.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>
                            {formatWhen(item.lastDownloadedAt)} ·{' '}
                            {item.downloadCount} download
                            {item.downloadCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => downloadAgain(item.id)}
                        >
                          Download Again
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {error && (
                <p className="banner sheet-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  signOut()
                  setOpen(false)
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <SignInForm
              lead="No password. We’ll email a link, or continue with Google. Anyone can do this — we don’t create accounts by hand."
              onSignedIn={() => {
                setAccountNotice(null)
                setOpen(true)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
