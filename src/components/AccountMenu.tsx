import { useEffect, useId, useRef, useState } from 'react'
import { CREDIT_PACKS } from '../commerce'

export function AccountMenu() {
  const [open, setOpen] = useState(false)
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

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-chip"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-who">Sign in</span>
        <span className="account-credits">0 credits</span>
      </button>
      {open && (
        <div className="account-panel" id={panelId} role="dialog" aria-label="Account">
          <p className="kicker">Account</p>
          <h2>Keep your maps</h2>
          <p className="hint">
            Sign-in will hold unused credits and past downloads. Layout only —
            nothing is stored yet.
          </p>
          <label>
            Email
            <input type="email" placeholder="you@example.com" disabled />
          </label>
          <button type="button" className="primary" disabled>
            Continue
          </button>
          <p className="account-balance">Guest · 0 credits</p>
          <ul className="pack-list">
            {CREDIT_PACKS.map((pack) => (
              <li key={pack.id}>
                <div>
                  <strong>
                    ${pack.usd} · {pack.credits} credit{pack.credits === 1 ? '' : 's'}
                  </strong>
                  <span>{pack.blurb}</span>
                </div>
                <button type="button" className="ghost" disabled>
                  Coming soon
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
