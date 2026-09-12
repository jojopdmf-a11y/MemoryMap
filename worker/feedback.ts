import type { SouvenirStore } from './souvenir.ts'

export type FeedbackEnv = {
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  FEEDBACK_TO?: string
  SOUVENIRS?: SouvenirStore
}

type StoredFeedback = {
  id: string
  createdAt: string
  comment: string
  email: string
  source: string
  emailed: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY = 12_000
const MAX_COMMENT = 4000
const CONTACT_TO = 'hello@memorymap.world'
const INDEX_KEY = 'feedback:v1:index'
const NOTE_PREFIX = 'feedback:v1:note:'
const NOTE_CAP = 200
const NOTES_FROM = 'MemoryMap <notes@memorymap.world>'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

function tooLarge(request: Request): boolean {
  const raw = request.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > MAX_BODY
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function addressOf(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase()
}

function inboxOwner(env: FeedbackEnv): string | null {
  const email = env.FEEDBACK_TO?.trim().toLowerCase() ?? ''
  return EMAIL_RE.test(email) ? email : null
}

function recipients(env: FeedbackEnv): string[] {
  const owner = inboxOwner(env)
  if (owner) return [owner]
  return [CONTACT_TO]
}

function sendingFrom(env: FeedbackEnv, to: string[]): string {
  const configured =
    env.RESEND_FROM?.trim() || 'MemoryMap <hello@memorymap.world>'
  const fromAddress = addressOf(configured)
  if (to.some((item) => item === fromAddress)) return NOTES_FROM
  return configured
}

async function persistNote(
  env: FeedbackEnv,
  note: StoredFeedback,
): Promise<boolean> {
  if (!env.SOUVENIRS) return false
  const rawIndex = await env.SOUVENIRS.get(INDEX_KEY)
  let ids: string[] = []
  if (rawIndex) {
    try {
      const parsed = JSON.parse(rawIndex) as unknown
      if (Array.isArray(parsed)) {
        ids = parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      ids = []
    }
  }
  ids = [note.id, ...ids.filter((id) => id !== note.id)].slice(0, NOTE_CAP)
  await env.SOUVENIRS.put(`${NOTE_PREFIX}${note.id}`, JSON.stringify(note))
  await env.SOUVENIRS.put(INDEX_KEY, JSON.stringify(ids))
  return true
}

async function sendMail(
  env: FeedbackEnv,
  comment: string,
  email: string,
  source: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false
  const to = recipients(env)
  const from = sendingFrom(env, to)
  const replyLine = email
    ? `They asked for a reply at ${email}.`
    : 'They did not leave an email.'
  const fromSouvenir = source.toLowerCase() === 'souvenir'
  const where = fromSouvenir ? 'a souvenir map' : 'the map page'
  const payload: Record<string, unknown> = {
    from,
    to,
    subject: fromSouvenir
      ? 'MemoryMap souvenir feedback'
      : 'MemoryMap feedback',
    text: `Feedback from ${where}:\n\n${comment}\n\n${replyLine}`,
  }
  if (email) payload.reply_to = email

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (res.ok) return true

  // notes@ is unverified on some Resend setups. Retry from hello@ to the
  // forwarded inbox, never from hello@ to hello@ (Cloudflare drops that loop).
  const owner = inboxOwner(env)
  const configured = env.RESEND_FROM?.trim()
  if (!owner || !configured || addressOf(configured) === owner) return false
  payload.from = configured
  payload.to = [owner]
  const retry = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return retry.ok
}

export async function handleFeedback(
  request: Request,
  env: FeedbackEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname !== '/api/feedback') return null
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Not found.' }, 404)
  }
  if (!env.RESEND_API_KEY && !env.SOUVENIRS) {
    return json({ error: 'Feedback is not connected yet.' }, 503)
  }
  if (tooLarge(request)) {
    return json({ error: 'That note is too long. Please shorten it.' }, 413)
  }

  let body: { comment?: string; email?: string; source?: string }
  try {
    body = (await request.json()) as {
      comment?: string
      email?: string
      source?: string
    }
  } catch {
    return json({ error: 'Write a short note to send.' }, 400)
  }

  const comment = String(body.comment ?? '').trim()
  if (comment.length < 2) {
    return json({ error: 'Write a short note to send.' }, 400)
  }
  if (comment.length > MAX_COMMENT) {
    return json({ error: 'That note is too long. Please shorten it.' }, 400)
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (email && !EMAIL_RE.test(email)) {
    return json({ error: 'Enter a valid email, or leave that field blank.' }, 400)
  }

  const source = String(body.source ?? '').trim()
  let emailed = false
  try {
    emailed = await sendMail(env, comment, email, source)
  } catch {
    emailed = false
  }

  const note: StoredFeedback = {
    id: uid(),
    createdAt: new Date().toISOString(),
    comment,
    email,
    source,
    emailed,
  }
  try {
    await persistNote(env, note)
  } catch {
    // Mail already went out. A missed KV copy should not fail the visitor.
  }

  return json({ ok: true })
}
