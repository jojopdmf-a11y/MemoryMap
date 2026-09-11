import { useSyncExternalStore } from 'react'
import { redeemMagicToken } from './authApi'
import {
  normalizeRecipe,
  recipeFingerprint,
  type SouvenirRecipe,
} from './recipe'

const STORE_KEY = 'memorymap.accounts.v1'

export type Purchase = {
  id: string
  packId: string
  credits: number
  usd: number
  createdAt: string
  source: 'local' | 'checkout'
}

export type LibraryItem = {
  id: string
  title: string
  filename: string
  fingerprint: string
  recipe: SouvenirRecipe
  createdAt: string
  lastDownloadedAt: string
  downloadCount: number
}

export type AccountRecord = {
  id: string
  email: string
  createdAt: string
  credits: number
  purchases: Purchase[]
  library: LibraryItem[]
}

type PendingLink = {
  email: string
  token: string
  createdAt: string
}

type Persisted = {
  accounts: AccountRecord[]
  pendingLinks: PendingLink[]
  sessionAccountId: string | null
}

export type AccountSnapshot = {
  account: AccountRecord | null
  notice: string | null
}

const listeners = new Set<() => void>()

let persisted = readStore()
let notice: string | null = null
let snapshot = makeSnapshot()
let downloadLock = false

function nowIso(): string {
  return new Date().toISOString()
}

function emptyStore(): Persisted {
  return { accounts: [], pendingLinks: [], sessionAccountId: null }
}

function readStore(): Persisted {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      pendingLinks: Array.isArray(parsed.pendingLinks) ? parsed.pendingLinks : [],
      sessionAccountId:
        typeof parsed.sessionAccountId === 'string'
          ? parsed.sessionAccountId
          : null,
    }
  } catch {
    return emptyStore()
  }
}

function writeStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(persisted))
}

function makeSnapshot(): AccountSnapshot {
  const account =
    persisted.accounts.find((item) => item.id === persisted.sessionAccountId) ??
    null
  return { account, notice }
}

function emit(persist = true) {
  if (persist) writeStore()
  snapshot = makeSnapshot()
  for (const listener of listeners) listener()
}

export function setAccountNotice(message: string | null) {
  notice = message
  emit(false)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): AccountSnapshot {
  return snapshot
}

export function useAccount(): AccountSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

function asPurchase(value: unknown): Purchase | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<Purchase>
  if (typeof row.id !== 'string' || typeof row.packId !== 'string') return null
  return {
    id: row.id,
    packId: row.packId,
    credits: Number(row.credits) || 0,
    usd: Number(row.usd) || 0,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : nowIso(),
    source: row.source === 'local' ? 'local' : 'checkout',
  }
}

function asLibraryItem(value: unknown): LibraryItem | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<LibraryItem>
  if (
    typeof row.id !== 'string' ||
    typeof row.fingerprint !== 'string' ||
    !row.recipe ||
    typeof row.recipe !== 'object'
  ) {
    return null
  }
  return {
    id: row.id,
    title: typeof row.title === 'string' ? row.title : 'Untitled trip',
    filename:
      typeof row.filename === 'string' ? row.filename : 'MemoryMap-trip.html',
    fingerprint: row.fingerprint,
    recipe: row.recipe as SouvenirRecipe,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : nowIso(),
    lastDownloadedAt:
      typeof row.lastDownloadedAt === 'string'
        ? row.lastDownloadedAt
        : nowIso(),
    downloadCount: Number(row.downloadCount) || 1,
  }
}

function applyServerAccount(data: Record<string, unknown>): AccountRecord {
  const email = String(data.email ?? '')
    .trim()
    .toLowerCase()
  if (!email) throw new Error('Sign in to continue.')
  const account: AccountRecord = {
    id: email,
    email,
    createdAt:
      typeof data.createdAt === 'string' ? data.createdAt : nowIso(),
    credits: Number.isFinite(Number(data.credits))
      ? Math.max(0, Number(data.credits))
      : 0,
    purchases: Array.isArray(data.purchases)
      ? data.purchases.map(asPurchase).filter((item): item is Purchase => Boolean(item))
      : [],
    library: Array.isArray(data.library)
      ? data.library
          .map(asLibraryItem)
          .filter((item): item is LibraryItem => Boolean(item))
      : [],
  }
  persisted = {
    ...persisted,
    accounts: [
      ...persisted.accounts.filter((item) => item.email !== email),
      account,
    ],
    sessionAccountId: account.id,
  }
  emit()
  return account
}

function clearSession() {
  persisted = { ...persisted, sessionAccountId: null }
  emit()
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function refreshAccount(): Promise<AccountRecord | null> {
  try {
    const res = await fetch('/api/account/me', { credentials: 'same-origin' })
    if (res.status === 401) {
      clearSession()
      return null
    }
    const data = await readJson(res)
    if (!res.ok) {
      return snapshot.account
    }
    return applyServerAccount(data)
  } catch {
    return snapshot.account
  }
}

export async function consumeSignInFromUrl(): Promise<boolean> {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('signin')
  if (token) {
    url.searchParams.delete('signin')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    try {
      await redeemMagicToken(token)
    } catch (err) {
      notice =
        err instanceof Error ? err.message : 'That sign-in link is not valid.'
      emit(false)
      await refreshAccount()
      return false
    }
  }
  const account = await refreshAccount()
  if (token && account) {
    notice = `Signed in as ${account.email}.`
    emit(false)
    return true
  }
  return Boolean(account)
}

export async function signOut() {
  try {
    await fetch('/api/account/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  } catch {
    // Cookie clear is best-effort; local session still ends.
  }
  notice = null
  clearSession()
}

export function requireAccount(): AccountRecord {
  const account = snapshot.account
  if (!account) {
    throw new Error('Sign in before buying credits or downloading a map.')
  }
  return account
}

export function findLibraryMatch(fingerprint: string): LibraryItem | null {
  const account = snapshot.account
  if (!account) return null
  return account.library.find((item) => item.fingerprint === fingerprint) ?? null
}

export async function claimPreviewCredits(): Promise<AccountRecord> {
  requireAccount()
  const res = await fetch('/api/account/preview-grant', {
    method: 'POST',
    credentials: 'same-origin',
  })
  const data = await readJson(res)
  if (!res.ok) {
    await refreshAccount()
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Could not add preview credits.',
    )
  }
  return applyServerAccount(data)
}

export async function keepDownload(
  recipe: SouvenirRecipe,
  filename: string,
): Promise<{ spent: boolean; account: AccountRecord }> {
  requireAccount()
  if (downloadLock) {
    throw new Error('Already keeping this map.')
  }
  downloadLock = true
  try {
    const normalized = normalizeRecipe(recipe)
    const fingerprint = recipeFingerprint(normalized)
    const res = await fetch('/api/account/download', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint,
        title: normalized.title,
        filename,
        recipe: normalized,
      }),
    })
    const data = await readJson(res)
    if (!res.ok) {
      await refreshAccount()
      const err = new Error(
        typeof data.error === 'string'
          ? data.error
          : 'Could not keep that map.',
      ) as Error & { code?: string }
      if (typeof data.code === 'string') err.code = data.code
      throw err
    }
    return {
      spent: data.spent === true,
      account: applyServerAccount(data),
    }
  } finally {
    downloadLock = false
  }
}

export function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
