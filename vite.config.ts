import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { memoryMapAuthPlugin } from './vite.auth.ts'

function guidesPublicFile(url = ''): string | null {
  const pathname = decodeURIComponent(url.split('?')[0] ?? '')
  if (pathname !== '/guides' && !pathname.startsWith('/guides/')) return null
  const rel = pathname.replace(/\/+$/, '') || '/guides'
  const fromPublic = join(process.cwd(), 'public', rel)
  if (existsSync(fromPublic) && statSync(fromPublic).isFile()) return fromPublic
  const index = join(fromPublic, 'index.html')
  if (existsSync(index) && statSync(index).isFile()) return index
  return null
}

function contentTypeFor(file: string): string {
  switch (extname(file)) {
    case '.css':
      return 'text/css; charset=utf-8'
    case '.html':
      return 'text/html; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

/** Pretty /guides/* URLs must serve public HTML, not the SPA shell. */
function serveGuidesHtml(): Plugin {
  const handle = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const pathname = (req.url ?? '').split('?')[0] ?? ''
    const file = guidesPublicFile(req.url ?? '')
    if (file) {
      res.statusCode = 200
      res.setHeader('Content-Type', contentTypeFor(file))
      res.end(readFileSync(file))
      return
    }
    if (pathname === '/guides' || pathname.startsWith('/guides/')) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Not found')
      return
    }
    next()
  }

  return {
    name: 'serve-guides-html',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [serveGuidesHtml(), react(), memoryMapAuthPlugin()],
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
})
