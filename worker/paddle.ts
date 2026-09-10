import {
  CREDIT_PACKS,
  packById,
  packByPriceId,
  type CreditPack,
} from '../src/creditPacks.ts'
import type { SouvenirStore } from './souvenir.ts'

export type PaddleEnv = {
  PADDLE_API_KEY?: string
  PADDLE_WEBHOOK_SECRET?: string
  PADDLE_SANDBOX?: string
  SOUVENIRS?: SouvenirStore
}

type Grant = {
  transactionId: string
  packId: string
  credits: number
  usd: number
  email: string
  at: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TXN_RE = /^txn_[a-z0-9]+$/i
const GRANT_TTL = 60 * 60 * 24 * 365
const GRANT_PREFIX = 'paddle:'
const MAX_BODY = 200_000

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function apiBase(env: PaddleEnv): string {
  return env.PADDLE_SANDBOX === '0'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'
}

function grantKey(transactionId: string): string {
  return `${GRANT_PREFIX}${transactionId}`
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function paddleFetch(
  env: PaddleEnv,
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const key = env.PADDLE_API_KEY?.trim()
  if (!key) throw new Error('Card checkout is not connected on this server yet.')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${key}`)
  headers.set('Paddle-Version', '1')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${apiBase(env)}${path}`, { ...init, headers })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const err = asRecord(data.error)
    const detail = asString(err?.detail) || asString(data.error)
    throw new Error(detail || 'Paddle could not complete that request.')
  }
  return data
}

function priceIdsFromTransaction(txn: Record<string, unknown>): string[] {
  const items = Array.isArray(txn.items) ? txn.items : []
  const ids: string[] = []
  for (const item of items) {
    const row = asRecord(item)
    if (!row) continue
    const direct = asString(row.price_id)
    if (direct) ids.push(direct)
    const price = asRecord(row.price)
    const nested = asString(price?.id)
    if (nested) ids.push(nested)
  }
  return ids
}

function packFromTransaction(txn: Record<string, unknown>): CreditPack | null {
  const custom = asRecord(txn.custom_data)
  const fromCustom = packById(asString(custom?.packId) || asString(custom?.pack_id))
  if (fromCustom) return fromCustom
  for (const priceId of priceIdsFromTransaction(txn)) {
    const pack = packByPriceId(priceId)
    if (pack) return pack
  }
  return null
}

function paidStatus(status: string): boolean {
  return status === 'paid' || status === 'completed'
}

function grantFromTransaction(txn: Record<string, unknown>): Grant | null {
  const transactionId = asString(txn.id)
  const status = asString(txn.status)
  if (!TXN_RE.test(transactionId) || !paidStatus(status)) return null
  const pack = packFromTransaction(txn)
  if (!pack) return null
  const custom = asRecord(txn.custom_data)
  const customer = asRecord(txn.customer)
  const email = normalizeEmail(
    asString(custom?.email) || asString(customer?.email),
  )
  return {
    transactionId,
    packId: pack.id,
    credits: pack.credits,
    usd: pack.usd,
    email,
    at: new Date().toISOString(),
  }
}

async function readGrant(
  env: PaddleEnv,
  transactionId: string,
): Promise<Grant | null> {
  const raw = await env.SOUVENIRS?.get(grantKey(transactionId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Grant
    if (!parsed?.transactionId || !parsed.packId) return null
    return parsed
  } catch {
    return null
  }
}

async function writeGrant(env: PaddleEnv, grant: Grant): Promise<void> {
  await env.SOUVENIRS?.put(grantKey(grant.transactionId), JSON.stringify(grant), {
    expirationTtl: GRANT_TTL,
  })
}

async function grantForTransaction(
  env: PaddleEnv,
  transactionId: string,
): Promise<Grant> {
  const existing = await readGrant(env, transactionId)
  if (existing) return existing
  const payload = await paddleFetch(env, `/transactions/${transactionId}`)
  const txn = asRecord(payload.data)
  if (!txn) throw new Error('Paddle did not return that payment.')
  const grant = grantFromTransaction(txn)
  if (!grant) {
    throw new Error('That payment is not a completed MemoryMap credit pack yet.')
  }
  await writeGrant(env, grant)
  return grant
}

function equalHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let out = 0
  for (let i = 0; i < left.length; i += 1) {
    out |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return out === 0
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  return [...new Uint8Array(sig)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function parseSignature(header: string): { ts: string; h1: string } | null {
  const parts: Record<string, string> = {}
  for (const piece of header.split(';')) {
    const [rawKey, ...rest] = piece.split('=')
    const key = rawKey?.trim()
    const value = rest.join('=').trim()
    if (key && value) parts[key] = value
  }
  if (!parts.ts || !parts.h1) return null
  return { ts: parts.ts, h1: parts.h1 }
}

async function verifyWebhook(
  env: PaddleEnv,
  raw: string,
  header: string,
): Promise<boolean> {
  const secret = env.PADDLE_WEBHOOK_SECRET?.trim()
  if (!secret) return false
  const parsed = parseSignature(header)
  if (!parsed) return false
  const expected = await hmacHex(secret, `${parsed.ts}:${raw}`)
  return equalHex(expected, parsed.h1)
}

async function handleCheckout(request: Request, env: PaddleEnv): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Not found.' }, 404)
  if (!env.PADDLE_API_KEY?.trim()) {
    return json({ error: 'Card checkout is not connected on this server yet.' }, 503)
  }
  let body: { packId?: string; email?: string }
  try {
    body = (await request.json()) as { packId?: string; email?: string }
  } catch {
    return json({ error: 'Choose a credit pack.' }, 400)
  }
  const pack = packById(String(body.packId ?? ''))
  if (!pack) return json({ error: 'Choose a credit pack.' }, 400)
  const email = normalizeEmail(String(body.email ?? ''))
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Sign in with a valid email before checkout.' }, 400)
  }
  try {
    const payload = await paddleFetch(env, '/transactions', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ price_id: pack.priceId, quantity: 1 }],
        custom_data: {
          app: 'memorymap',
          packId: pack.id,
          email,
        },
        collection_mode: 'automatic',
      }),
    })
    const txn = asRecord(payload.data)
    const checkout = asRecord(txn?.checkout)
    return json({
      transactionId: asString(txn?.id),
      url: asString(checkout?.url) || null,
      packId: pack.id,
    })
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not start checkout.',
      },
      400,
    )
  }
}

async function handleFulfill(request: Request, env: PaddleEnv): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Not found.' }, 404)
  if (!env.PADDLE_API_KEY?.trim()) {
    return json({ error: 'Card checkout is not connected on this server yet.' }, 503)
  }
  let body: { transactionId?: string }
  try {
    body = (await request.json()) as { transactionId?: string }
  } catch {
    return json({ error: 'Missing payment.' }, 400)
  }
  const transactionId = String(body.transactionId ?? '').trim()
  if (!TXN_RE.test(transactionId)) {
    return json({ error: 'Missing payment.' }, 400)
  }
  try {
    const grant = await grantForTransaction(env, transactionId)
    return json({
      transactionId: grant.transactionId,
      packId: grant.packId,
      credits: grant.credits,
      usd: grant.usd,
      email: grant.email,
    })
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not confirm that payment.',
      },
      400,
    )
  }
}

async function handleWebhook(request: Request, env: PaddleEnv): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Not found.' }, 404)
  const length = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(length) && length > MAX_BODY) {
    return json({ error: 'Too large.' }, 413)
  }
  const raw = await request.text()
  const header = request.headers.get('paddle-signature') ?? ''
  if (!(await verifyWebhook(env, raw, header))) {
    return json({ error: 'Invalid webhook signature.' }, 400)
  }
  let event: Record<string, unknown>
  try {
    event = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid webhook.' }, 400)
  }
  const data = asRecord(event.data)
  if (data) {
    const grant = grantFromTransaction(data)
    if (grant) await writeGrant(env, grant)
  }
  return json({ ok: true })
}

export async function handlePaddle(
  request: Request,
  env: PaddleEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname === '/api/paddle/checkout') return handleCheckout(request, env)
  if (url.pathname === '/api/paddle/fulfill') return handleFulfill(request, env)
  if (url.pathname === '/api/paddle/webhook') return handleWebhook(request, env)
  if (url.pathname === '/api/paddle/config' && request.method === 'GET') {
    return json({
      sandbox: env.PADDLE_SANDBOX !== '0',
      serverReady: Boolean(env.PADDLE_API_KEY?.trim()),
      packs: CREDIT_PACKS.map((pack) => ({
        id: pack.id,
        credits: pack.credits,
        usd: pack.usd,
      })),
    })
  }
  return null
}
