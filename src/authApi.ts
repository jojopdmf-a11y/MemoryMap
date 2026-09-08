export type AuthConfig = {
  googleClientId: string
  emailReady: boolean
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function fail(data: Record<string, unknown>, fallback: string): Error {
  return new Error(asString(data.error) || fallback)
}

export async function loadAuthConfig(): Promise<AuthConfig> {
  const fromEnv = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
  try {
    const res = await fetch('/api/auth/config')
    const data = await readJson(res)
    if (!res.ok) {
      return { googleClientId: fromEnv, emailReady: false }
    }
    return {
      googleClientId: asString(data.googleClientId) || fromEnv,
      emailReady: data.emailReady === true,
    }
  } catch {
    return { googleClientId: fromEnv, emailReady: false }
  }
}

export async function requestMagicLink(
  email: string,
): Promise<{ email: string; previewLink?: string }> {
  let res: Response
  try {
    res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch {
    throw new Error('Could not reach MemoryMap sign-in.')
  }
  const data = await readJson(res)
  const sentTo = asString(data.email)
  if (!res.ok || !sentTo) {
    throw fail(data, 'Could not send the sign-in email.')
  }
  const previewLink = asString(data.previewLink) || undefined
  return { email: sentTo, previewLink }
}

export async function redeemMagicToken(token: string): Promise<string> {
  let res: Response
  try {
    res = await fetch('/api/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {
    throw new Error('Could not reach MemoryMap sign-in.')
  }
  const data = await readJson(res)
  const email = asString(data.email)
  if (!res.ok || !email) {
    throw fail(data, 'That sign-in link is not valid.')
  }
  return email
}

export async function redeemGoogleAccessToken(
  accessToken: string,
): Promise<string> {
  let res: Response
  try {
    res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    })
  } catch {
    throw new Error('Could not reach MemoryMap sign-in.')
  }
  const data = await readJson(res)
  const email = asString(data.email)
  if (!res.ok || !email) {
    throw fail(data, 'Google sign-in failed.')
  }
  return email
}
