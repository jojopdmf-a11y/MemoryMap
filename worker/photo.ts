const MAX_BYTES = 4_000_000
const FETCH_MS = 12_000

function bad(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return true
  // Block obvious private / link-local IPv4 literals.
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
  return false
}

/** Proxy remote stop photos so the browser can resize them for the souvenir. */
export async function handlePhoto(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname !== '/api/photo') return null
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  if (request.method !== 'GET') return bad(405, 'Use GET.')

  const target = url.searchParams.get('url')?.trim() ?? ''
  if (!target) return bad(400, 'Missing photo url.')

  let remote: URL
  try {
    remote = new URL(target)
  } catch {
    return bad(400, 'Photo url is not valid.')
  }
  if (remote.protocol !== 'http:' && remote.protocol !== 'https:') {
    return bad(400, 'Photo url must be http or https.')
  }
  if (isBlockedHost(remote.hostname)) {
    return bad(400, 'That photo host is not allowed.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_MS)
  try {
    const upstream = await fetch(remote.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'image/*,*/*;q=0.8' },
    })
    if (!upstream.ok) {
      return bad(502, `Photo host returned ${upstream.status}.`)
    }
    const type = (upstream.headers.get('content-type') || '').split(';')[0].trim()
    if (type && !type.startsWith('image/')) {
      return bad(415, 'That url is not an image.')
    }
    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength === 0) return bad(502, 'Photo was empty.')
    if (buffer.byteLength > MAX_BYTES) {
      return bad(413, 'Photo is larger than 4 MB.')
    }
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return bad(502, 'Could not fetch that photo.')
  } finally {
    clearTimeout(timer)
  }
}
