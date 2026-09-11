export const PADDLE_CLIENT_TOKEN = 'test_672372ebb1891ee2d818a7bc293'
export const PADDLE_SANDBOX: boolean = true
export const PREVIEW_GRANT_CREDITS = 3

export const CREDIT_PACKS = [
  {
    id: 'one',
    credits: 1,
    usd: 2,
    blurb: 'One souvenir',
    priceId: 'pri_01m246s9w36dtncatd7y2hy98w',
  },
  {
    id: 'three',
    credits: 3,
    usd: 5,
    blurb: 'Three souvenirs',
    priceId: 'pri_01m246sa48c91anzhcm7easdf3',
  },
  {
    id: 'ten',
    credits: 10,
    usd: 10,
    blurb: 'Ten souvenirs',
    priceId: 'pri_01m246sabkepwkqnnypmyger43',
  },
] as const

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id']
export type CreditPack = (typeof CREDIT_PACKS)[number]

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id)
}

export function packByPriceId(priceId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.priceId === priceId)
}

export function paddleConfigured(): boolean {
  return Boolean(PADDLE_CLIENT_TOKEN)
}
