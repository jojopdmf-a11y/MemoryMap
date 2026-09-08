import { useEffect, useId, useRef, useState } from 'react'
import {
  setAccountNotice,
  signOut,
  useAccount,
} from '../accountStore'
import { SignInForm } from './SignInForm'

export function AccountMenu() {
  const { account, notice } = useAccount()
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
        <span className="account-who">{account ? account.email : 'Sign in'}</span>
        <span className="account-credits">
          {account ? 'Signed in' : 'Email or Google'}
        </span>
      </button>
      {open && (
        <div className="account-panel" id={panelId} role="dialog" aria-label="Account">
          <p className="kicker">Account</p>
          <h2>{account ? 'You’re signed in' : 'Create your account'}</h2>
          {notice && (
            <p className="hint" role="status">
              {notice}
            </p>
          )}
          {account ? (
            <>
              <p className="account-balance">{account.email}</p>
              <p className="hint">
                Sign-in is optional. Download stays free in this public preview.
                This session stays in this browser.
              </p>
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
