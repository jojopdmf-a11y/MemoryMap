import { handleAccount } from './worker/account'
import { handleAuth, type AuthEnv } from './worker/auth'
import { handleFeedback } from './worker/feedback'
import { handleGeo } from './worker/geo'
import { handlePaddle, type PaddleEnv } from './worker/paddle'
import { handleSouvenir, type SouvenirEnv } from './worker/souvenir'

export interface Env extends AuthEnv, SouvenirEnv, PaddleEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    try {
      const souvenir = await handleSouvenir(request, env)
      if (souvenir) return souvenir
      const geo = await handleGeo(request)
      if (geo) return geo
      const auth = await handleAuth(request, env)
      if (auth) return auth
      const account = await handleAccount(request, env)
      if (account) return account
      const paddle = await handlePaddle(request, env)
      if (paddle) return paddle
      const feedback = await handleFeedback(request, env)
      if (feedback) return feedback
    } catch {
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/')) {
        return new Response(
          JSON.stringify({ error: 'Could not complete that request.' }),
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
