import type { SouvenirStore } from './souvenir.ts'

export type AuditEnv = {
  SOUVENIRS?: SouvenirStore
}

export type LoginAuditEvent = {
  id: string
  createdAt: string
  email: string
  method: 'email' | 'google'
  country: string
}

const INDEX_KEY = 'audit:v1:logins'
const EVENT_PREFIX = 'audit:v1:login:'
const EVENT_CAP = 500

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function countryFromRequest(request: Request): string {
  const raw = request.headers.get('cf-ipcountry')?.trim().toUpperCase() ?? ''
  if (!raw || raw === 'XX' || raw === 'T1') return ''
  return raw.slice(0, 8)
}

export async function recordLogin(
  env: AuditEnv,
  request: Request,
  email: string,
  method: LoginAuditEvent['method'],
): Promise<void> {
  if (!env.SOUVENIRS) return
  const event: LoginAuditEvent = {
    id: uid(),
    createdAt: new Date().toISOString(),
    email: email.trim().toLowerCase(),
    method,
    country: countryFromRequest(request),
  }
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
  const nextIds = [event.id, ...ids.filter((id) => id !== event.id)].slice(
    0,
    EVENT_CAP,
  )
  const dropped = ids.filter((id) => !nextIds.includes(id))
  await env.SOUVENIRS.put(`${EVENT_PREFIX}${event.id}`, JSON.stringify(event))
  await env.SOUVENIRS.put(INDEX_KEY, JSON.stringify(nextIds))
  for (const id of dropped.slice(0, 20)) {
    try {
      await env.SOUVENIRS.delete?.(`${EVENT_PREFIX}${id}`)
    } catch {
      // Best-effort cleanup of older events.
    }
  }
}

export async function listLogins(env: AuditEnv): Promise<LoginAuditEvent[]> {
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
  const events: LoginAuditEvent[] = []
  for (const id of ids.slice(0, EVENT_CAP)) {
    const raw = await env.SOUVENIRS.get(`${EVENT_PREFIX}${id}`)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as Partial<LoginAuditEvent>
      if (typeof parsed.email !== 'string' || !parsed.email) continue
      const method =
        parsed.method === 'google' || parsed.method === 'email'
          ? parsed.method
          : 'email'
      events.push({
        id: typeof parsed.id === 'string' ? parsed.id : id,
        createdAt:
          typeof parsed.createdAt === 'string'
            ? parsed.createdAt
            : new Date().toISOString(),
        email: parsed.email.trim().toLowerCase(),
        method,
        country: typeof parsed.country === 'string' ? parsed.country : '',
      })
    } catch {
      // Skip corrupt rows.
    }
  }
  return events
}
