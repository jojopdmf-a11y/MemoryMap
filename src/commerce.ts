export {
  CREDIT_PACKS,
  PADDLE_CLIENT_TOKEN,
  PADDLE_SANDBOX,
  PREVIEW_GRANT_CREDITS,
  packById,
  packByPriceId,
  paddleConfigured,
  type CreditPack,
  type CreditPackId,
} from './creditPacks'

import { paddleConfigured, type CreditPack } from './creditPacks'

/** Optional hosted checkout URL override. Paddle overlay is the default. */
export function checkoutConfigured(): boolean {
  return paddleConfigured() || Boolean(import.meta.env.VITE_CHECKOUT_BASE_URL)
}

export function checkoutUrl(pack: CreditPack, email: string): string | null {
  const base = import.meta.env.VITE_CHECKOUT_BASE_URL
  if (!base) return null
  const url = new URL(String(base), window.location.origin)
  url.searchParams.set('pack', pack.id)
  url.searchParams.set('email', email)
  return url.toString()
}

export function googleClientId(): string {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
}
