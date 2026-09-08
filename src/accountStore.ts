import { useSyncExternalStore } from 'react'
import { redeemMagicToken } from './authApi'
import { type CreditPack } from './commerce'
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

function nowIso(): string {
  return new Date().toISOString()
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
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
        typeof parsed.sessionAccountId === 'string' ? parsed.sessionAccountId : null,
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

function upsertAccount(email: string): AccountRecord {
  const normalized = normalizeEmail(email)
  const existing = persisted.accounts.find((item) => item.email === normalized)
  if (existing) return existing
  const created: AccountRecord = {
    id: uid('acct'),
    email: normalized,
    createdAt: nowIso(),
    credits: 0,
    purchases: [],
    library: [],
  }
  persisted = { ...persisted, accounts: [...persisted.accounts, created] }
  return created
}

function replaceAccount(next: AccountRecord) {
  persisted = {
    ...persisted,
    accounts: persisted.accounts.map((item) => (item.id === next.id ? next : item)),
  }
}

export async function consumeSignInFromUrl(): Promise<boolean> {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('signin')
  if (!token) return false
  url.searchParams.delete('signin')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  try {
    const email = await redeemMagicToken(token)
    signInWithEmail(email)
    notice = `Signed in as ${email}.`
    emit(false)
    return true
  } catch (err) {
    notice =
      err instanceof Error ? err.message : 'That sign-in link is not valid.'
    emit(false)
    return false
  }
}

export function signInWithEmail(email: string): AccountRecord {
  const account = upsertAccount(email)
  persisted = { ...persisted, sessionAccountId: account.id }
  notice = null
  emit()
  return account
}

export function signOut() {
  persisted = { ...persisted, sessionAccountId: null }
  notice = null
  emit()
}

export function requireAccount(): AccountRecord {
  const account =
    persisted.accounts.find((item) => item.id === persisted.sessionAccountId) ??
    null
  if (!account) {
    throw new Error('Sign in before buying credits or downloading a map.')
  }
  return account
}

export function buyPack(pack: CreditPack, source: Purchase['source'] = 'local'): AccountRecord {
  const account = requireAccount()
  const next: AccountRecord = {
    ...account,
    credits: account.credits + pack.credits,
    purchases: [
      {
        id: uid('pay'),
        packId: pack.id,
        credits: pack.credits,
        usd: pack.usd,
        createdAt: nowIso(),
        source,
      },
      ...account.purchases,
    ],
  }
  replaceAccount(next)
  emit()
  return next
}

export function findLibraryMatch(fingerprint: string): LibraryItem | null {
  const account = snapshot.account
  if (!account) return null
  return account.library.find((item) => item.fingerprint === fingerprint) ?? null
}

export function recordPaidDownload(
  recipe: SouvenirRecipe,
  filename: string,
): LibraryItem {
  const account = requireAccount()
  const normalized = normalizeRecipe(recipe)
  const fingerprint = recipeFingerprint(normalized)
  const existing = account.library.find((item) => item.fingerprint === fingerprint)
  if (existing) return completeFreeRedownload(existing.id)

  if (account.credits < 1) {
    throw new Error('Buy a credit pack to download this map.')
  }
  const item: LibraryItem = {
    id: uid('map'),
    title: normalized.title,
    filename,
    fingerprint,
    recipe: normalized,
    createdAt: nowIso(),
    lastDownloadedAt: nowIso(),
    downloadCount: 1,
  }
  replaceAccount({
    ...account,
    credits: account.credits - 1,
    library: [item, ...account.library],
  })
  emit()
  return item
}

export function completeFreeRedownload(id: string): LibraryItem {
  const account = requireAccount()
  const existing = account.library.find((item) => item.id === id)
  if (!existing) {
    throw new Error('That saved map is no longer on this account.')
  }
  const item: LibraryItem = {
    ...existing,
    lastDownloadedAt: nowIso(),
    downloadCount: existing.downloadCount + 1,
  }
  replaceAccount({
    ...account,
    library: account.library.map((row) => (row.id === id ? item : row)),
  })
  emit()
  return item
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
