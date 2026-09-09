import { useEffect, useId, useRef, useState } from 'react'
import {
  buyPack,
  findLibraryMatch,
  recordPaidDownload,
  completeFreeRedownload,
  requireAccount,
  useAccount,
} from '../accountStore'
import {
  CREDIT_PACKS,
  checkoutConfigured,
  checkoutUrl,
  type CreditPack,
} from '../commerce'
import { saveSouvenir } from '../download'
import { recipeFingerprint, type SouvenirRecipe } from '../recipe'
import { buildSouvenirHtml } from '../souvenir'
import { souvenirFilename } from '../trip'
import { SignInForm } from './SignInForm'

type Intent = 'download' | 'buy'

type Props = {
  open: boolean
  intent: Intent
  recipe: SouvenirRecipe | null
  onClose: () => void
}

async function saveFile(recipe: SouvenirRecipe) {
  const filename = souvenirFilename(recipe.title)
  await saveSouvenir(filename, (hosted) =>
    buildSouvenirHtml(recipe.title, recipe.stops, recipe.look, hosted),
  )
  return filename
}

export function DownloadSheet({ open, intent, recipe, onClose }: Props) {
  const { account } = useAccount()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
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

  function purchase(pack: CreditPack) {
    setError(null)
    setNote(null)
    try {
      requireAccount()
      if (checkoutConfigured()) {
        const url = checkoutUrl(pack, account?.email ?? '')
        if (url) {
          window.location.assign(url)
          return
        }
      }
      buyPack(pack, 'local')
      setNote(
        `Added ${pack.credits} credit${pack.credits === 1 ? '' : 's'} on this browser. Card checkout will use a merchant of record once it is connected.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add credits.')
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
    try {
      if (match) {
        completeFreeRedownload(match.id)
        await saveFile(match.recipe)
      } else {
        const filenameUsed = souvenirFilename(recipe.title)
        recordPaidDownload(recipe, filenameUsed)
        await saveFile(recipe)
      }
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the map.')
    }
  }

  const heading = !account
    ? 'Sign in to continue'
    : intent === 'buy' || (!match && (account.credits < 1) && recipe)
      ? 'Buy credits'
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
            lead="Preview and styling stay free. Sign in before you buy credits or take a file home. No password — we email a link, or use Google."
          />
        )}

        {account && (intent === 'buy' || (!match && account.credits < 1 && recipe)) && (
          <>
            <p className="hint">
              {account.email} · {account.credits} credit
              {account.credits === 1 ? '' : 's'}. A download uses 1 credit.
              {checkoutConfigured()
                ? ' Checkout opens our merchant of record.'
                : ' Card charges are not live yet; a pack only adds credits on this browser.'}
            </p>
            <ul className="pack-row">
              {CREDIT_PACKS.map((pack) => (
                <li key={pack.id}>
                  <button
                    type="button"
                    className="pack-card"
                    onClick={() => purchase(pack)}
                  >
                    <strong>${pack.usd}</strong>
                    <span>
                      {pack.credits} map{pack.credits === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {account && recipe && (match || account.credits > 0) && (
          <>
            <p className="hint">
              {match
                ? `${match.title} is already on your account. Download again is free — no credit used.`
                : `Download ${recipe.title} as ${filename}? You will have ${leftover} credit${leftover === 1 ? '' : 's'} left. We save this recipe so a later copy of the same map is free. Change the trip or styling and the next download spends a credit.`}
            </p>
            <div className="sheet-actions">
              <button type="button" className="primary" onClick={confirmDownload}>
                {match ? 'Download again' : 'Use 1 credit and download'}
              </button>
              <button type="button" className="ghost" onClick={close}>
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
