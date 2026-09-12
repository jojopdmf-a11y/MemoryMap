import { useEffect, useId, useRef, useState } from 'react'
import {
  claimPreviewCredits,
  fetchFeedbackNotes,
  formatWhen,
  keepDownload,
  setAccountNotice,
  signOut,
  useAccount,
  type FeedbackInboxNote,
} from '../accountStore'
import {
  CREDIT_PACKS,
  PADDLE_SANDBOX,
  PREVIEW_GRANT_CREDITS,
  paddleConfigured,
  type CreditPack,
} from '../commerce'
import { saveSouvenir } from '../download'
import { htmlForSouvenir } from '../souvenir'
import { recipeFingerprint } from '../recipe'
import {
  DEFAULT_PAYMENT_LINK_HELP,
  openCreditCheckout,
} from '../paddleCheckout'
import { claimChrome, onChromeClaim } from '../chrome'
import { SignInForm } from './SignInForm'

export function AccountMenu() {
  const { account, notice } = useAccount()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [notes, setNotes] = useState<FeedbackInboxNote[] | null>(null)
  const [notesError, setNotesError] = useState<string | null>(null)
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

  useEffect(() => {
    if (!open || !account?.inbox) return
    let cancelled = false
    setNotesError(null)
    void fetchFeedbackNotes()
      .then((rows) => {
        if (!cancelled) setNotes(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          setNotesError(
            err instanceof Error ? err.message : 'Could not load feedback notes.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, account?.inbox])

  async function addPreviewCredits() {
    if (!account) return
    setError(null)
    setBuying(true)
    try {
      const next = await claimPreviewCredits()
      setAccountNotice(
        `Added ${PREVIEW_GRANT_CREDITS} preview credits. No charge while MemoryMap is in public preview. You now have ${next.credits}.`,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not add preview credits.',
      )
    } finally {
      setBuying(false)
    }
  }

  async function buy(pack: CreditPack) {
    if (!account) return
    setError(null)
    setBuying(true)
    try {
      await openCreditCheckout(pack, account.email)
      setAccountNotice(
        'Paddle sandbox checkout is opening. Credits land on your account after payment is confirmed.',
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start checkout.'
      setError(message)
      setAccountNotice(
        /default payment link/i.test(message)
          ? DEFAULT_PAYMENT_LINK_HELP
          : message,
      )
    } finally {
      setBuying(false)
    }
  }

  async function downloadAgain(id: string) {
    if (!account) return
    setError(null)
    try {
      const item = account.library.find((row) => row.id === id)
      if (!item) throw new Error('That saved map is no longer on this account.')
      await keepDownload(item.recipe, item.filename)
      await saveSouvenir(
        item.filename,
        (hosted) =>
          htmlForSouvenir(
            item.recipe.title,
            item.recipe.stops,
            item.recipe.look,
            hosted,
          ),
        recipeFingerprint(item.recipe),
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
            ? account.credits > 0
              ? `${account.credits} credit${account.credits === 1 ? '' : 's'} · ${account.library.length} saved`
              : `${account.library.length} saved map${account.library.length === 1 ? '' : 's'}`
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
                Signed in {formatWhen(account.createdAt) || 'today'}. Mapping and
                Play stay free. Keeping a new map uses 1 credit. The same trip
                and style can be downloaded again for free. Credits live on your
                MemoryMap account, not only this browser.
                {PADDLE_SANDBOX
                  ? ' During this public preview you can add credits at no charge.'
                  : ''}
                {account.credits > 0
                  ? ` You have ${account.credits} credit${account.credits === 1 ? '' : 's'}.`
                  : ''}
              </p>
              {PADDLE_SANDBOX && account.credits < 1 && (
                <div className="history-block">
                  <p className="kicker">Preview credits</p>
                  <p className="hint">
                    Live card charges are off. Add {PREVIEW_GRANT_CREDITS}{' '}
                    credits at no charge, then keep a map.
                  </p>
                  <div className="sheet-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={buying}
                      onClick={() => void addPreviewCredits()}
                    >
                      {buying
                        ? 'Adding credits…'
                        : `Add ${PREVIEW_GRANT_CREDITS} preview credits`}
                    </button>
                  </div>
                </div>
              )}
              {!PADDLE_SANDBOX && paddleConfigured() && (
                <div className="history-block">
                  <p className="kicker">Paddle sandbox</p>
                  <p className="hint">
                    Test card checkout through Paddle. Live charges are off.
                    After a sandbox payment, credits land on your account.
                    Checkout needs a default payment link in Paddle → Checkout →
                    Checkout settings (https://memorymap.world/ or
                    https://localhost/).
                  </p>
                  <ul className="pack-row">
                    {CREDIT_PACKS.map((pack) => (
                      <li key={pack.id}>
                        <button
                          type="button"
                          className="pack-card"
                          disabled={buying}
                          onClick={() => void buy(pack)}
                        >
                          <strong>${pack.usd}</strong>
                          <span>
                            {pack.credits} credit{pack.credits === 1 ? '' : 's'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {account.inbox && (
                <div className="history-block">
                  <p className="kicker">Feedback notes</p>
                  {notesError && (
                    <p className="hint" role="alert">
                      {notesError}
                    </p>
                  )}
                  {notes === null && !notesError ? (
                    <p className="hint">Loading notes…</p>
                  ) : notes && notes.length === 0 ? (
                    <p className="hint">
                      No form notes stored yet. Older notes from before this
                      list only exist in Resend.
                    </p>
                  ) : (
                    <ul className="history-list note-list">
                      {(notes ?? []).map((note) => (
                        <li key={note.id}>
                          <div>
                            <strong>
                              {formatWhen(note.createdAt) || 'Just now'}
                              {note.email ? ` · ${note.email}` : ''}
                            </strong>
                            <p>{note.comment}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="history-block">
                <p className="kicker">Downloads</p>
                {account.library.length === 0 ? (
                  <p className="hint">
                    No saved maps yet. Keep a souvenir while signed in and it
                    will show up here so you can download it again for free.
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
                  void signOut()
                  setOpen(false)
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <SignInForm
              lead="No password. We’ll email a link, or continue with Google. Anyone can do this — we don’t create accounts by hand. During this public preview, credits are free to add after you sign in."
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
