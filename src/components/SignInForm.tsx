import { useState } from 'react'
import { googleClientId } from '../commerce'
import {
  magicLinkHref,
  requestMagicLink,
  redeemMagicLink,
  useAccount,
} from '../accountStore'
import { continueWithGoogle } from '../googleAuth'

type Props = {
  lead?: string
  onSignedIn?: () => void
}

export function SignInForm({ lead, onSignedIn }: Props) {
  const { pendingEmail, pendingToken } = useAccount()
  const [email, setEmail] = useState(pendingEmail ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const googleReady = Boolean(googleClientId())

  function sendLink() {
    setError(null)
    try {
      requestMagicLink(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in.')
    }
  }

  function openLink() {
    if (!pendingToken) return
    setError(null)
    try {
      redeemMagicLink(pendingToken)
      onSignedIn?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That sign-in link failed.')
    }
  }

  async function google() {
    setBusy(true)
    setError(null)
    try {
      await continueWithGoogle()
      onSignedIn?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin-form">
      {lead && <p className="hint">{lead}</p>}
      {pendingToken && pendingEmail ? (
        <>
          <p className="hint">
            A sign-in link is ready for <strong>{pendingEmail}</strong>. When
            email is connected we will send it. Until then, use the same link
            here.
          </p>
          <button type="button" className="primary" onClick={openLink}>
            Open sign-in link
          </button>
          <p className="hint signin-link-wrap">
            <a href={magicLinkHref(pendingToken)}>Or open this link</a>
          </p>
        </>
      ) : (
        <form
          className="signin-email"
          onSubmit={(e) => {
            e.preventDefault()
            sendLink()
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" className="primary" disabled={!email.trim()}>
            Email me a link
          </button>
        </form>
      )}
      <button
        type="button"
        className="ghost"
        disabled={!googleReady || busy}
        onClick={() => void google()}
      >
        Continue with Google
      </button>
      {!googleReady && (
        <p className="hint">
          Google sign-in waits on a client ID. Email links work now.
        </p>
      )}
      {error && (
        <p className="banner sheet-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
