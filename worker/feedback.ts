export type FeedbackEnv = {
  RESEND_API_KEY?: string
  RESEND_FROM?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY = 12_000
const MAX_COMMENT = 4000
const CONTACT_TO = 'hello@memorymap.world'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function tooLarge(request: Request): boolean {
  const raw = request.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > MAX_BODY
}

export async function handleFeedback(
  request: Request,
  env: FeedbackEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname !== '/api/feedback') return null
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Not found.' }, 404)
  }
  if (!env.RESEND_API_KEY) {
    return json({ error: 'Feedback is not connected yet.' }, 503)
  }
  if (tooLarge(request)) {
    return json({ error: 'That note is too long. Please shorten it.' }, 413)
  }

  let body: { comment?: string; email?: string }
  try {
    body = (await request.json()) as { comment?: string; email?: string }
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

  const from = env.RESEND_FROM?.trim() || 'MemoryMap <hello@memorymap.world>'
  const replyLine = email
    ? `They asked for a reply at ${email}.`
    : 'They did not leave an email.'
  const payload: Record<string, unknown> = {
    from,
    to: [CONTACT_TO],
    subject: 'MemoryMap feedback',
    text: `Feedback from the map page:\n\n${comment}\n\n${replyLine}`,
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
  if (!res.ok) {
    return json({ error: 'Could not send that note. Try hello@memorymap.world.' }, 502)
  }
  return json({ ok: true })
}
