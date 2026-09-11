import type { SouvenirStore } from './souvenir.ts'

export type LedgerEnv = {
  SOUVENIRS?: SouvenirStore
}

export type LedgerPurchase = {
  id: string
  packId: string
  credits: number
  usd: number
  createdAt: string
}

export type LedgerLibraryItem = {
  id: string
  title: string
  filename: string
  fingerprint: string
  recipe: unknown
  createdAt: string
  lastDownloadedAt: string
  downloadCount: number
}

export type LedgerAccount = {
  email: string
  createdAt: string
  credits: number
  purchases: LedgerPurchase[]
  library: LedgerLibraryItem[]
}

const ACCOUNT_PREFIX = 'acct:v1:'
const LIBRARY_CAP = 40

function nowIso(): string {
  return new Date().toISOString()
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function accountKey(email: string): string {
  return `${ACCOUNT_PREFIX}${email.trim().toLowerCase()}`
}

function emptyAccount(email: string): LedgerAccount {
  return {
    email: email.trim().toLowerCase(),
    createdAt: nowIso(),
    credits: 0,
    purchases: [],
    library: [],
  }
}

function asAccount(raw: string | null, email: string): LedgerAccount {
  if (!raw) return emptyAccount(email)
  try {
    const parsed = JSON.parse(raw) as Partial<LedgerAccount>
    return {
      email: email.trim().toLowerCase(),
      createdAt:
        typeof parsed.createdAt === 'string' ? parsed.createdAt : nowIso(),
      credits: Number.isFinite(parsed.credits) ? Math.max(0, Number(parsed.credits)) : 0,
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      library: Array.isArray(parsed.library) ? parsed.library : [],
    }
  } catch {
    return emptyAccount(email)
  }
}

export async function readAccount(
  env: LedgerEnv,
  email: string,
): Promise<LedgerAccount> {
  const key = accountKey(email)
  const raw = (await env.SOUVENIRS?.get(key)) ?? null
  return asAccount(raw, email)
}

async function writeAccount(
  env: LedgerEnv,
  account: LedgerAccount,
): Promise<void> {
  if (!env.SOUVENIRS) throw new Error('Account storage is not connected.')
  const trimmed: LedgerAccount = {
    ...account,
    library: account.library.slice(0, LIBRARY_CAP),
  }
  await env.SOUVENIRS.put(accountKey(account.email), JSON.stringify(trimmed))
}

export async function ensureAccount(
  env: LedgerEnv,
  email: string,
): Promise<LedgerAccount> {
  const existing = await readAccount(env, email)
  const key = accountKey(email)
  const raw = (await env.SOUVENIRS?.get(key)) ?? null
  if (!raw) await writeAccount(env, existing)
  return existing
}

export async function applyPurchase(
  env: LedgerEnv,
  email: string,
  purchase: LedgerPurchase,
): Promise<LedgerAccount> {
  const account = await ensureAccount(env, email)
  if (account.purchases.some((item) => item.id === purchase.id)) {
    return account
  }
  const next: LedgerAccount = {
    ...account,
    credits: account.credits + purchase.credits,
    purchases: [purchase, ...account.purchases],
  }
  await writeAccount(env, next)
  return next
}

export async function keepMap(
  env: LedgerEnv,
  email: string,
  input: {
    fingerprint: string
    title: string
    filename: string
    recipe: unknown
  },
): Promise<{ account: LedgerAccount; spent: boolean }> {
  const account = await ensureAccount(env, email)
  const fingerprint = input.fingerprint.trim()
  if (!fingerprint) {
    throw new Error('Could not identify that map.')
  }
  const existing = account.library.find((item) => item.fingerprint === fingerprint)
  if (existing) {
    const item: LedgerLibraryItem = {
      ...existing,
      lastDownloadedAt: nowIso(),
      downloadCount: existing.downloadCount + 1,
      recipe: input.recipe ?? existing.recipe,
      title: input.title.trim() || existing.title,
      filename: input.filename.trim() || existing.filename,
    }
    const next: LedgerAccount = {
      ...account,
      library: [item, ...account.library.filter((row) => row.id !== item.id)],
    }
    await writeAccount(env, next)
    return { account: next, spent: false }
  }
  if (account.credits < 1) {
    const err = new Error('Buy a credit pack to keep this map.')
    ;(err as Error & { code?: string }).code = 'need_credits'
    throw err
  }
  const item: LedgerLibraryItem = {
    id: uid('map'),
    title: input.title.trim() || 'Untitled trip',
    filename: input.filename.trim() || 'MemoryMap-trip.html',
    fingerprint,
    recipe: input.recipe,
    createdAt: nowIso(),
    lastDownloadedAt: nowIso(),
    downloadCount: 1,
  }
  const next: LedgerAccount = {
    ...account,
    credits: account.credits - 1,
    library: [item, ...account.library],
  }
  await writeAccount(env, next)
  return { account: next, spent: true }
}

export function publicAccount(account: LedgerAccount) {
  return {
    email: account.email,
    createdAt: account.createdAt,
    credits: account.credits,
    purchases: account.purchases,
    library: account.library,
  }
}

export async function hasKeptFingerprint(
  env: LedgerEnv,
  email: string,
  fingerprint: string,
): Promise<boolean> {
  const needle = fingerprint.trim()
  if (!needle) return false
  const account = await readAccount(env, email)
  return account.library.some((item) => item.fingerprint === needle)
}
