import { useEffect, useId, useRef, useState } from 'react'
import {
  claimPreviewCredits,
  findLibraryMatch,
  keepDownload,
  requireAccount,
  useAccount,
} from '../accountStore'
import {
  CREDIT_PACKS,
  PADDLE_SANDBOX,
  PREVIEW_GRANT_CREDITS,
  checkoutUrl,
  paddleConfigured,
  type CreditPack,
} from '../commerce'
import { openCreditCheckout } from '../paddleCheckout'
import { saveSouvenir } from '../download'
import { recipeFingerprint, type SouvenirRecipe } from '../recipe'
import { htmlForSouvenir } from '../souvenir'
import { souvenirFilename } from '../trip'
import type { LatLng } from '../route'
import { SignInForm } from './SignInForm'

type Intent = 'download' | 'buy'

type Props = {
  open: boolean
  intent: Intent
  recipe: SouvenirRecipe | null
  roads?: LatLng[][] | null
  onClose: () => void
}

async function saveFile(recipe: SouvenirRecipe, roads?: LatLng[][] | null) {
  const filename = souvenirFilename(recipe.title)
  const fingerprint = recipeFingerprint(recipe)
  await saveSouvenir(
    filename,
    (hosted) => htmlForSouvenir(recipe.title, recipe.stops, recipe.look, hosted, roads ?? null),
    fingerprint,
  )
  return filename
}

export function DownloadSheet({ open, intent, recipe, roads, onClose }: Props) {
  const { account } = useAccount()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [keeping, setKeeping] = useState(false)
  const match = recipe ? findLibraryMatch(recipeFingerprint(recipe)) : null
  const filename = recipe ? souvenirFilename(recipe.title) : 'MemoryMap-trip.html'
  const leftover = account ? Math.max(0, account.credits - (match ? 0 : 1)) : 0

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function addPreviewCredits() {
    setError(null)
    setNote(null)
    setBuying(true)
    try {
      requireAccount()
      await claimPreviewCredits()
      setNote(
        `Added ${PREVIEW_GRANT_CREDITS} preview credits. No charge while MemoryMap is in public preview.`,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not add preview credits.',
      )
    } finally {
      setBuying(false)
    }
  }

  async function purchase(pack: CreditPack) {
    setError(null)
    setNote(null)
    try {
      requireAccount()
      if (paddleConfigured()) {
        setBuying(true)
        await openCreditCheckout(pack, account?.email ?? '')
        setNote(
          'Paddle sandbox checkout is opening. Credits land on your account after payment is confirmed.',
        )
        return
      }
      const url = checkoutUrl(pack, account?.email ?? '')
      if (url) {
        window.location.assign(url)
        return
      }
      setError(
        'Card checkout is not connected on this server yet. Paddle sandbox has to be available before credits can be added.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add credits.')
    } finally {
      setBuying(false)
    }
  }

  function close() {
    setError(null)
    setNote(null)
    onClose()
  }

  async function confirmDownload() {
    if (!recipe) return
    setError(null)
    setKeeping(true)
    try {
      const filenameUsed = souvenirFilename(recipe.title)
      await keepDownload(recipe, filenameUsed)
      await saveFile(recipe, roads)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the map.')
    } finally {
      setKeeping(false)
    }
  }

  const needsCredits = Boolean(
    account && (intent === 'buy' || (!match && account.credits < 1 && recipe)),
  )
  const heading = !account
    ? 'Sign in to continue'
    : needsCredits
      ? PADDLE_SANDBOX
        ? 'Preview credits'
        : 'Buy credits'
      : match
        ? 'Download again'
        : 'Use 1 credit?'

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <p className="kicker">MemoryMap</p>
        <h2 id={titleId}>{heading}</h2>

        {!account && (
          <SignInForm
            lead="Preview and styling stay free. Sign in before you keep a file. No password — we email a link, or use Google. During this public preview, credits are free to add."
          />
        )}

        {account && needsCredits && (
          <>
            <p className="hint">
              {account.email} · {account.credits} credit
              {account.credits === 1 ? '' : 's'}. Keeping a new map uses 1
              credit.
              {PADDLE_SANDBOX
                ? ' During this public preview you can add credits at no charge. Live card charges are off.'
                : paddleConfigured()
                  ? ' Checkout is Paddle sandbox — test cards only. Live charges are off.'
                  : ' Card checkout is not connected on this server yet.'}
            </p>
            {PADDLE_SANDBOX ? (
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
            ) : (
              <ul className="pack-row">
                {CREDIT_PACKS.map((pack) => (
                  <li key={pack.id}>
                    <button
                      type="button"
                      className="pack-card"
                      disabled={buying}
                      onClick={() => void purchase(pack)}
                    >
                      <strong>${pack.usd}</strong>
                      <span>
                        {pack.credits} map{pack.credits === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {account && recipe && (match || account.credits > 0) && (
          <>
            <p className="hint">
              {match
                ? `${match.title} is already on your account. Download again is free — no credit used.`
                : `Keep ${recipe.title} as ${filename}? You will have ${leftover} credit${leftover === 1 ? '' : 's'} left. The same trip and style can be downloaded again for free. Change the trip or styling and the next keep spends a credit.`}
            </p>
            <div className="sheet-actions">
              <button
                type="button"
                className="primary"
                disabled={keeping}
                onClick={() => void confirmDownload()}
              >
                {keeping
                  ? 'Keeping…'
                  : match
                    ? 'Download again'
                    : 'Use 1 credit and download'}
              </button>
              <button type="button" className="ghost" onClick={close} disabled={keeping}>
                Cancel
              </button>
            </div>
          </>
        )}

        {account && intent === 'buy' && account.credits > 0 && !recipe && (
          <p className="hint">
            Credits are ready. Style the map, then press Download map.
          </p>
        )}

        {note && <p className="hint">{note}</p>}
        {error && (
          <p className="banner sheet-error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="linkish sheet-dismiss" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}
