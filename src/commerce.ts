export const CREDIT_PACKS = [
  { id: 'one', credits: 1, usd: 2, blurb: 'One souvenir' },
  { id: 'three', credits: 3, usd: 5, blurb: 'Three souvenirs' },
  { id: 'ten', credits: 10, usd: 10, blurb: 'Ten souvenirs' },
] as const

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id']
export type CreditPack = (typeof CREDIT_PACKS)[number]

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id)
}

/** Set VITE_CHECKOUT_BASE_URL to a merchant-of-record checkout when payments go live. */
export function checkoutConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CHECKOUT_BASE_URL)
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
