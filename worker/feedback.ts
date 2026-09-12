import type { SouvenirStore } from './souvenir.ts'

export type FeedbackEnv = {
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  FEEDBACK_TO?: string
  SOUVENIRS?: SouvenirStore
}

export type StoredFeedback = {
  id: string
  createdAt: string
  comment: string
  email: string
  source: string
  emailed: boolean
  mail?: {
    from: string
    to: string[]
    status: number
    id?: string
    error?: string
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY = 12_000
const MAX_COMMENT = 4000
const CONTACT_TO = 'hello@memorymap.world'
const INDEX_KEY = 'feedback:v1:index'
const NOTE_PREFIX = 'feedback:v1:note:'
const NOTE_CAP = 200
const RESEND_TEST_FROM = 'MemoryMap <onboarding@resend.dev>'
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

export function isFeedbackInbox(email: string, env: FeedbackEnv): boolean {
  const owner = env.FEEDBACK_TO?.trim().toLowerCase() ?? ''
  return EMAIL_RE.test(owner) && email.trim().toLowerCase() === owner
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

export async function listFeedbackNotes(
  env: FeedbackEnv,
): Promise<StoredFeedback[]> {
  if (!env.SOUVENIRS) return []
  const rawIndex = await env.SOUVENIRS.get(INDEX_KEY)
  if (!rawIndex) return []
  let ids: string[] = []
  try {
    const parsed = JSON.parse(rawIndex) as unknown
    if (Array.isArray(parsed)) {
      ids = parsed.filter((item): item is string => typeof item === 'string')
    }
  } catch {
    return []
  }
  const notes: StoredFeedback[] = []
  for (const id of ids.slice(0, NOTE_CAP)) {
    const raw = await env.SOUVENIRS.get(`${NOTE_PREFIX}${id}`)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as Partial<StoredFeedback>
      if (typeof parsed.comment !== 'string') continue
      notes.push({
        id: typeof parsed.id === 'string' ? parsed.id : id,
        createdAt:
          typeof parsed.createdAt === 'string'
            ? parsed.createdAt
            : new Date().toISOString(),
        comment: parsed.comment,
        email: typeof parsed.email === 'string' ? parsed.email : '',
        source: typeof parsed.source === 'string' ? parsed.source : '',
        emailed: Boolean(parsed.emailed),
        mail: parsed.mail,
      })
    } catch {
      continue
    }
  }
  return notes
}

async function sendMail(
  env: FeedbackEnv,
  comment: string,
  email: string,
  source: string,
): Promise<StoredFeedback['mail'] & { ok: boolean }> {
  if (!env.RESEND_API_KEY) {
    return { ok: false, from: RESEND_TEST_FROM, to: [CONTACT_TO], status: 0 }
  }
  // Resend's testing From can only deliver to the account mailbox. Sending
  // from @memorymap.world is accepted, then dropped by Cloudflare/AOL.
  const owner = env.FEEDBACK_TO?.trim().toLowerCase() ?? ''
  const to = EMAIL_RE.test(owner) ? [owner] : [CONTACT_TO]
  const from = EMAIL_RE.test(owner)
    ? RESEND_TEST_FROM
    : env.RESEND_FROM?.trim() || RESEND_TEST_FROM
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
  const raw = await res.text()
  let parsed: { id?: string; message?: string; error?: { message?: string } } =
    {}
  try {
    parsed = JSON.parse(raw) as typeof parsed
  } catch {
    parsed = {}
  }
  const error =
    parsed.error?.message ||
    parsed.message ||
    (res.ok ? undefined : raw.slice(0, 300))
  console.log(
    `feedback-mail status=${res.status} from=${from} to=${to.join(',')} id=${parsed.id ?? ''} error=${error ?? ''}`,
  )
  return {
    ok: res.ok,
    from,
    to,
    status: res.status,
    id: parsed.id,
    error,
  }
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
  let mail: StoredFeedback['mail'] & { ok: boolean } = {
    ok: false,
    from: RESEND_TEST_FROM,
    to: [CONTACT_TO],
    status: 0,
  }
  try {
    mail = await sendMail(env, comment, email, source)
  } catch {
    mail = {
      ok: false,
      from: RESEND_TEST_FROM,
      to: [CONTACT_TO],
      status: 0,
      error: 'send failed',
    }
  }

  const note: StoredFeedback = {
    id: uid(),
    createdAt: new Date().toISOString(),
    comment,
    email,
    source,
    emailed: mail.ok,
    mail: {
      from: mail.from,
      to: mail.to,
      status: mail.status,
      id: mail.id,
      error: mail.error,
    },
  }
  try {
    await persistNote(env, note)
  } catch {
    // Keep going. Email success is what the visitor cares about.
  }

  if (!mail.ok) {
    return json(
      { error: 'Could not send that note. Try hello@memorymap.world.' },
      502,
    )
  }
  return json({ ok: true })
}
