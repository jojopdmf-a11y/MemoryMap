import type { AuthEnv } from './auth.ts'
import {
  applyPurchase,
  ensureAccount,
  keepMap,
  publicAccount,
  type LedgerEnv,
} from './ledger.ts'
import { cookieHeader, emailFromRequest } from './session.ts'

export type AccountEnv = AuthEnv & LedgerEnv

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function statusFor(err: unknown): number {
  const message = err instanceof Error ? err.message : ''
  const code = (err as { code?: string } | null)?.code
  if (code === 'need_credits') return 402
  if (/Sign in|expired/i.test(message)) return 401
  if (/not connected/i.test(message)) return 503
  return 400
}

export async function handleAccount(
  request: Request,
  env: AccountEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/account/')) return null
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (url.pathname === '/api/account/me' && request.method === 'GET') {
    try {
      const email = await emailFromRequest(request, env.AUTH_SECRET)
      const account = await ensureAccount(env, email)
      return json(publicAccount(account))
    } catch (err) {
      return json(
        {
          error:
            err instanceof Error ? err.message : 'Sign in to continue.',
        },
        statusFor(err),
      )
    }
  }

  if (url.pathname === '/api/account/logout' && request.method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': cookieHeader('', request, true),
      },
    })
  }

  if (url.pathname === '/api/account/download' && request.method === 'POST') {
    try {
      const email = await emailFromRequest(request, env.AUTH_SECRET)
      let body: {
        fingerprint?: string
        title?: string
        filename?: string
        recipe?: unknown
      }
      try {
        body = (await request.json()) as typeof body
      } catch {
        return json({ error: 'Could not identify that map.' }, 400)
      }
      const result = await keepMap(env, email, {
        fingerprint: String(body.fingerprint ?? ''),
        title: String(body.title ?? ''),
        filename: String(body.filename ?? ''),
        recipe: body.recipe ?? null,
      })
      return json({
        spent: result.spent,
        ...publicAccount(result.account),
      })
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      return json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Could not keep that map.',
          code,
        },
        statusFor(err),
      )
    }
  }

  if (url.pathname === '/api/account/dev-grant' && request.method === 'POST') {
    if (env.ALLOW_DEV_LINKS !== '1') {
      return json({ error: 'Not found.' }, 404)
    }
    try {
      const email = await emailFromRequest(request, env.AUTH_SECRET)
      const account = await applyPurchase(env, email, {
        id: `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        packId: 'starter',
        credits: 3,
        usd: 0,
        createdAt: new Date().toISOString(),
      })
      return json(publicAccount(account))
    } catch (err) {
      return json(
        {
          error:
            err instanceof Error ? err.message : 'Could not add credits.',
        },
        statusFor(err),
      )
    }
  }

  return json({ error: 'Not found.' }, 404)
}
