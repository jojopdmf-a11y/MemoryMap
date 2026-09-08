import { handleAuth, type AuthEnv } from './worker/auth'

export interface Env extends AuthEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    try {
      const auth = await handleAuth(request, env)
      if (auth) return auth
    } catch {
      if (url.pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ error: 'Sign-in is not available right now.' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          },
        )
      }
    }
    return env.ASSETS.fetch(request)
  },
}
