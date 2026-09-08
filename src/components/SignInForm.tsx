import { useEffect, useState } from 'react'
import { loadAuthConfig, requestMagicLink } from '../authApi'
import { googleClientId } from '../commerce'
import { continueWithGoogle } from '../googleAuth'

type Props = {
  lead?: string
  onSignedIn?: () => void
}

export function SignInForm({ lead, onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [previewLink, setPreviewLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleId, setGoogleId] = useState(() => googleClientId())
  const googleReady = Boolean(googleId)

  useEffect(() => {
    void loadAuthConfig().then((config) => {
      if (config.googleClientId) setGoogleId(config.googleClientId)
    })
  }, [])

  async function sendLink() {
    setBusy(true)
    setError(null)
    try {
      const result = await requestMagicLink(email)
      setSentTo(result.email)
      setPreviewLink(result.previewLink ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in.')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setError(null)
    try {
      await continueWithGoogle(googleId)
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
      {sentTo ? (
        <>
          <p className="hint">
            If mail can reach <strong>{sentTo}</strong>, the sign-in link is on
            its way. It expires in 30 minutes.
          </p>
          {previewLink && (
            <p className="hint signin-link-wrap">
              This computer is showing the link because email sending is not
              connected yet.{' '}
              <a href={previewLink}>Open sign-in link</a>
            </p>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setSentTo(null)
              setPreviewLink(null)
            }}
          >
            Use a different email
          </button>
        </>
      ) : (
        <form
          className="signin-email"
          onSubmit={(e) => {
            e.preventDefault()
            void sendLink()
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
              disabled={busy}
            />
          </label>
          <button
            type="submit"
            className="primary"
            disabled={busy || !email.trim()}
          >
            {busy ? 'Sending…' : 'Email me a link'}
          </button>
        </form>
      )}
      <p className="signin-or">or</p>
      <button
        type="button"
        className="ghost"
        disabled={busy}
        onClick={() => void google()}
      >
        Continue with Google
      </button>
      {!googleReady && (
        <p className="hint">
          Google sign-in needs a one-time client ID. Until that’s added, use
          email.
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
