import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { handleAccount } from './worker/account.ts'
import { handleAuth, type AuthEnv } from './worker/auth.ts'
import { handleFeedback } from './worker/feedback.ts'
import { handleGeo } from './worker/geo.ts'
import { handlePaddle } from './worker/paddle.ts'
import { handleSouvenir, type SouvenirStore } from './worker/souvenir.ts'

loadDevVars()

function loadDevVars() {
  const file = resolve(process.cwd(), '.dev.vars')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key] || key.startsWith('PADDLE_')) {
      process.env[key] = value
    }
  }
}

const localSouvenirs = new Map<string, string>()

const localSouvenirStore: SouvenirStore = {
  async get(key) {
    return localSouvenirs.get(key) ?? null
  },
  async put(key, value, _options) {
    localSouvenirs.set(key, value)
  },
}

function localAuthEnv(): AuthEnv & {
  SOUVENIRS: SouvenirStore
  PADDLE_API_KEY?: string
  PADDLE_WEBHOOK_SECRET?: string
  PADDLE_SANDBOX?: string
} {
  return {
    AUTH_SECRET: process.env.AUTH_SECRET || 'memorymap-dev-auth-secret',
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    FEEDBACK_TO: process.env.FEEDBACK_TO,
    GOOGLE_CLIENT_ID:
      process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID,
    ALLOW_DEV_LINKS: process.env.ALLOW_DEV_LINKS ?? '1',
    PADDLE_API_KEY: process.env.PADDLE_API_KEY,
    PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET,
    PADDLE_SANDBOX: process.env.PADDLE_SANDBOX ?? '1',
    SOUVENIRS: localSouvenirStore,
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
  if (!req.url?.startsWith('/api/') && !req.url?.startsWith('/s/')) {
    next()
    return
  }
  try {
    const request = await toRequest(req)
    const env = localAuthEnv()
    const response =
      (await handleSouvenir(request, env)) ??
      (await handleGeo(request)) ??
      (await handleAuth(request, env)) ??
      (await handleAccount(request, env)) ??
      (await handlePaddle(request, env)) ??
      (await handleFeedback(request, env))
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
