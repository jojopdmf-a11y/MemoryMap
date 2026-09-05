import { useEffect, useId, useRef, useState } from 'react'
import {
  completeFreeRedownload,
  formatWhen,
  signOut,
  useAccount,
} from '../accountStore'
import { CREDIT_PACKS } from '../commerce'
import { downloadText } from '../download'
import { buildSouvenirHtml } from '../souvenir'
import { SignInForm } from './SignInForm'

type Props = {
  onBuyCredits: () => void
}

export function AccountMenu({ onBuyCredits }: Props) {
  const { account } = useAccount()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
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

  function downloadAgain(id: string) {
    setError(null)
    try {
      const item = completeFreeRedownload(id)
      const html = buildSouvenirHtml(item.recipe.title, item.recipe.stops, item.recipe.look)
      downloadText(html, item.filename, 'text/html;charset=utf-8')
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
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-who">{account ? account.email : 'Sign in'}</span>
        <span className="account-credits">
          {account
            ? `${account.credits} credit${account.credits === 1 ? '' : 's'}`
            : '0 credits'}
        </span>
      </button>
      {open && (
        <div className="account-panel" id={panelId} role="dialog" aria-label="Account">
          <p className="kicker">Account</p>
          <h2>{account ? 'Your maps' : 'Keep your maps'}</h2>
          {account ? (
            <>
              <p className="account-balance">
                {account.email} · {account.credits} credit
                {account.credits === 1 ? '' : 's'}
              </p>
              <p className="hint">
                Preview stays in this browser. A paid download saves the recipe
                so you can get the same file again for free.
              </p>
              <ul className="pack-list">
                {CREDIT_PACKS.map((pack) => (
                  <li key={pack.id}>
                    <div>
                      <strong>
                        ${pack.usd} · {pack.credits} credit
                        {pack.credits === 1 ? '' : 's'}
                      </strong>
                      <span>{pack.blurb}</span>
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setOpen(false)
                        onBuyCredits()
                      }}
                    >
                      Buy
                    </button>
                  </li>
                ))}
              </ul>
              <div className="history-block">
                <p className="kicker">Downloads</p>
                {account.library.length === 0 ? (
                  <p className="hint">Paid maps will be listed here.</p>
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
                          Again
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
              <button type="button" className="linkish" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <SignInForm
              lead="Sign in before you buy. We hold unused credits and the maps you already paid for. No password."
              onSignedIn={() => setOpen(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}
