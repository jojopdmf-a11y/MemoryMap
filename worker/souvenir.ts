export type SouvenirStore = {
  get: (key: string) => Promise<string | null>
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ) => Promise<void>
}

export type SouvenirEnv = {
  SOUVENIRS?: SouvenirStore
}

const MAX_BYTES = 1_200_000
const TTL_SECONDS = 60 * 60 * 24 * 30
const ID_RE = /^[0-9a-f]{32}$/

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function souvenirResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function newId(): string {
  return crypto.randomUUID().replaceAll('-', '')
}

function isHtml(text: string): boolean {
  const head = text.slice(0, 64).toLowerCase().replace(/^\uFEFF/, '').trim()
  return head.startsWith('<!doctype html') || head.startsWith('<html')
}

export async function handleSouvenir(
  request: Request,
  env: SouvenirEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  const view = url.pathname.match(/^\/s\/([0-9a-f]{32})\/?$/)
  if (view) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'Not found.' }, 404)
    }
    const id = view[1]
    if (!ID_RE.test(id) || !env.SOUVENIRS) {
      return json({ error: 'That map is not here.' }, 404)
    }
    const html = await env.SOUVENIRS.get(id)
    if (!html) return json({ error: 'That map is not here.' }, 404)
    return souvenirResponse(html)
  }

  if (url.pathname !== '/api/souvenir') return null
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Not found.' }, 404)
  }
  if (!env.SOUVENIRS) {
    return json({ error: 'Could not keep that map for phones.' }, 503)
  }
  const length = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(length) && length > MAX_BYTES) {
    return json({ error: 'That map file is too large.' }, 413)
  }
  const html = await request.text()
  if (html.length > MAX_BYTES || !isHtml(html)) {
    return json({ error: 'That is not a MemoryMap file.' }, 400)
  }
  const id = newId()
  await env.SOUVENIRS.put(id, html, { expirationTtl: TTL_SECONDS })
  return json({ id, url: `/s/${id}` })
}
