import { useEffect, useId, useRef, useState } from 'react'
import { useAccount } from '../accountStore'
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../site'

export function FeedbackNote() {
  const { account } = useAccount()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    if (!email && account?.email) setEmail(account.email)
  }, [open, account, email])

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

  async function send() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment, email }),
      })
      let data: { error?: string } = {}
      try {
        data = (await res.json()) as { error?: string }
      } catch {
        data = {}
      }
      if (!res.ok) {
        throw new Error(data.error || 'Could not send that note.')
      }
      setSent(true)
      setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that note.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="map-feedback" ref={rootRef}>
      <button
        type="button"
        className="ghost map-feedback-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current)
          setSent(false)
          setError(null)
        }}
      >
        Feedback or suggestions
      </button>
      {open && (
        <div
          className="map-feedback-panel"
          id={panelId}
          role="dialog"
          aria-label="Feedback or suggestions"
        >
          {sent ? (
            <>
              <p className="hint">
                Thanks. We read these at{' '}
                <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
              </p>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setSent(false)
                  setOpen(false)
                }}
              >
                Close
              </button>
            </>
          ) : (
            <form
              className="map-feedback-form"
              onSubmit={(event) => {
                event.preventDefault()
                void send()
              }}
            >
              <p className="hint">
                Tell us what to improve. You can also write{' '}
                <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
              </p>
              <label>
                Comment
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  required
                  disabled={busy}
                  placeholder="What should we change or add?"
                />
              </label>
              <label>
                Email for a reply (optional)
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy}
                  placeholder="you@example.com"
                />
              </label>
              {error && (
                <p className="banner sheet-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="primary"
                disabled={busy || comment.trim().length < 2}
              >
                {busy ? 'Sending…' : 'Send note'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
