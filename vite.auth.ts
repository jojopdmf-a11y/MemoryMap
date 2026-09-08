import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { handleAuth, type AuthEnv } from './worker/auth.ts'
import { handleFeedback } from './worker/feedback.ts'

function localAuthEnv(): AuthEnv {
  return {
    AUTH_SECRET: process.env.AUTH_SECRET || 'memorymap-dev-auth-secret',
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    GOOGLE_CLIENT_ID:
      process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID,
    ALLOW_DEV_LINKS: process.env.ALLOW_DEV_LINKS ?? '1',
  }
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host || '127.0.0.1'
  const url = `http://${host}${req.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }
  const method = req.method || 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? new Uint8Array(await readBody(req)) : undefined
  return new Request(url, { method, headers, body })
}

async function pipe(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  if (!req.url?.startsWith('/api/')) {
    next()
    return
  }
  try {
    const request = await toRequest(req)
    const env = localAuthEnv()
    const response =
      (await handleAuth(request, env)) ?? (await handleFeedback(request, env))
    if (!response) {
      next()
      return
    }
    res.statusCode = response.status
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Could not complete that request.' }))
  }
}

export function memoryMapAuthPlugin(): Plugin {
  return {
    name: 'memorymap-auth',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void pipe(req, res, next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void pipe(req, res, next)
      })
    },
  }
}
