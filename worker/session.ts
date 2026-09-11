export const SESSION_COOKIE = 'mm_session'
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000

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

export async function signSession(email: string, secret: string): Promise<string> {
  const payload = b64url(
    JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS }),
  )
  const sig = await hmacHex(secret, payload)
  return `${payload}.${sig}`
}

export async function readSession(
  token: string,
  secret: string,
): Promise<string> {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) throw new Error('Sign in to continue.')
  const expected = await hmacHex(secret, payload)
  if (!equalHex(expected, sig)) throw new Error('Sign in to continue.')
  let parsed: { email?: string; exp?: number }
  try {
    parsed = JSON.parse(fromB64url(payload)) as { email?: string; exp?: number }
  } catch {
    throw new Error('Sign in to continue.')
  }
  if (!parsed.email || typeof parsed.exp !== 'number') {
    throw new Error('Sign in to continue.')
  }
  if (Date.now() > parsed.exp) {
    throw new Error('That sign-in expired. Sign in again.')
  }
  return parsed.email.trim().toLowerCase()
}

export function cookieHeader(
  token: string,
  request: Request,
  clear = false,
): string {
  const secure = new URL(request.url).protocol === 'https:'
  const parts = [
    `${SESSION_COOKIE}=${clear ? '' : token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (clear) parts.push('Max-Age=0')
  else parts.push(`Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`)
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function sessionTokenFromRequest(request: Request): string {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${SESSION_COOKIE}=`)) {
      return decodeURIComponent(trimmed.slice(SESSION_COOKIE.length + 1))
    }
  }
  return ''
}

export async function emailFromRequest(
  request: Request,
  secret: string | undefined,
): Promise<string> {
  if (!secret) throw new Error('Sign-in is not connected yet.')
  const token = sessionTokenFromRequest(request)
  if (!token) throw new Error('Sign in to continue.')
  return readSession(token, secret)
}
