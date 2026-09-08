export type AuthEnv = {
  AUTH_SECRET?: string
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  GOOGLE_CLIENT_ID?: string
  ALLOW_DEV_LINKS?: string
}

const LINK_TTL_MS = 30 * 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY = 4096

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function b64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromB64url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return atob(padded + pad)
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

export async function signMagicToken(
  email: string,
  secret: string,
): Promise<string> {
  const payload = b64url(
    JSON.stringify({ email, exp: Date.now() + LINK_TTL_MS }),
  )
  const sig = await hmacHex(secret, payload)
  return `${payload}.${sig}`
}

export async function readMagicToken(
  token: string,
  secret: string,
): Promise<string> {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) throw new Error('That sign-in link is not valid.')
  const expected = await hmacHex(secret, payload)
  if (!equalHex(expected, sig)) throw new Error('That sign-in link is not valid.')
  let parsed: { email?: string; exp?: number }
  try {
    parsed = JSON.parse(fromB64url(payload)) as { email?: string; exp?: number }
  } catch {
    throw new Error('That sign-in link is not valid.')
  }
  if (!parsed.email || typeof parsed.exp !== 'number') {
    throw new Error('That sign-in link is not valid.')
  }
  if (Date.now() > parsed.exp) {
    throw new Error('That sign-in link expired. Ask for a new one.')
  }
  return parsed.email
}

function signInUrl(request: Request, token: string): string {
  const url = new URL(request.url)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  url.searchParams.set('signin', token)
  return url.toString()
}

function tooLarge(request: Request): boolean {
  const raw = request.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > MAX_BODY
}

async function sendResend(
  env: AuthEnv,
  email: string,
  link: string,
): Promise<void> {
  const from =
    env.RESEND_FROM?.trim() || 'MemoryMap <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your MemoryMap sign-in link',
      text: `Sign in to MemoryMap with this link (expires in 30 minutes):\n\n${link}\n\nIf you did not ask for this, you can ignore the email.`,
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(
      /domain|not verified|from/i.test(detail)
        ? 'Could not send email until the MemoryMap sending domain is verified.'
        : 'Could not send the sign-in email.',
    )
  }
}

async function magicLink(request: Request, env: AuthEnv): Promise<Response> {
  if (!env.AUTH_SECRET) {
    return json({ error: 'Email sign-in is not connected yet.' }, 503)
  }
  if (tooLarge(request)) return json({ error: 'Enter a valid email address.' }, 413)
  let body: { email?: string }
  try {
    body = (await request.json()) as { email?: string }
  } catch {
    return json({ error: 'Enter a valid email address.' }, 400)
  }
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Enter a valid email address.' }, 400)
  }
  const token = await signMagicToken(email, env.AUTH_SECRET)
  const link = signInUrl(request, token)
  const allowDev = env.ALLOW_DEV_LINKS === '1'
  if (env.RESEND_API_KEY) {
    try {
      await sendResend(env, email, link)
    } catch (err) {
      if (!allowDev) {
        return json(
          {
            error:
              err instanceof Error
                ? err.message
                : 'Could not send the sign-in email.',
          },
          502,
        )
      }
    }
  } else if (!allowDev) {
    return json({ error: 'Email sign-in is not connected yet.' }, 503)
  }
  return json({
    ok: true,
    email,
    previewLink: allowDev ? link : undefined,
  })
}

async function redeem(request: Request, env: AuthEnv): Promise<Response> {
  if (!env.AUTH_SECRET) {
    return json({ error: 'Email sign-in is not connected yet.' }, 503)
  }
  if (tooLarge(request)) {
    return json({ error: 'That sign-in link is not valid.' }, 413)
  }
  let body: { token?: string }
  try {
    body = (await request.json()) as { token?: string }
  } catch {
    return json({ error: 'That sign-in link is not valid.' }, 400)
  }
  try {
    const email = await readMagicToken(String(body.token ?? ''), env.AUTH_SECRET)
    return json({ email })
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error ? err.message : 'That sign-in link is not valid.',
      },
      400,
    )
  }
}

function verifiedEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}

async function googleSignIn(request: Request, env: AuthEnv): Promise<Response> {
  if (tooLarge(request)) return json({ error: 'Google sign-in failed.' }, 413)
  let body: { credential?: string; accessToken?: string }
  try {
    body = (await request.json()) as {
      credential?: string
      accessToken?: string
    }
  } catch {
    return json({ error: 'Google sign-in failed.' }, 400)
  }

  const credential = String(body.credential ?? '').trim()
  const accessToken = String(body.accessToken ?? '').trim()

  if (credential) {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    )
    if (!res.ok) return json({ error: 'Google sign-in failed.' }, 401)
    const info = (await res.json()) as {
      email?: string
      email_verified?: string | boolean
      aud?: string
    }
    const expected = env.GOOGLE_CLIENT_ID?.trim()
    if (expected && info.aud !== expected) {
      return json({ error: 'Google sign-in failed.' }, 401)
    }
    const verified =
      info.email_verified === true || info.email_verified === 'true'
    const email = verifiedEmail(info.email)
    if (!verified || !email) {
      return json({ error: 'Google did not share a verified email.' }, 401)
    }
    return json({ email })
  }

  if (accessToken) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return json({ error: 'Google sign-in failed.' }, 401)
    const profile = (await res.json()) as {
      email?: string
      email_verified?: string | boolean
    }
    const verified =
      profile.email_verified === true ||
      profile.email_verified === 'true' ||
      profile.email_verified == null
    const email = verifiedEmail(profile.email)
    if (!email || !verified) {
      return json({ error: 'Google did not share a verified email.' }, 401)
    }
    return json({ email })
  }

  return json({ error: 'Google sign-in failed.' }, 400)
}

function authConfig(env: AuthEnv): Response {
  return json({
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || '',
    emailReady: Boolean(env.AUTH_SECRET && env.RESEND_API_KEY),
  })
}

export async function handleAuth(
  request: Request,
  env: AuthEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/auth/')) return null
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (url.pathname === '/api/auth/config' && request.method === 'GET') {
    return authConfig(env)
  }
  if (url.pathname === '/api/auth/magic-link' && request.method === 'POST') {
    return magicLink(request, env)
  }
  if (url.pathname === '/api/auth/redeem' && request.method === 'POST') {
    return redeem(request, env)
  }
  if (url.pathname === '/api/auth/google' && request.method === 'POST') {
    return googleSignIn(request, env)
  }
  return json({ error: 'Not found.' }, 404)
}
