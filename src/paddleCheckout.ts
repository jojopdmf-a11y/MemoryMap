import { applyCheckoutGrant, requireAccount, setAccountNotice } from './accountStore'
import {
  PADDLE_CLIENT_TOKEN,
  packById,
  paddleConfigured,
  type CreditPack,
} from './commerce'

type PaddleCheckout = {
  Environment: { set: (value: string) => void }
  Initialize: (options: Record<string, unknown>) => void
  Checkout: { open: (options: Record<string, unknown>) => void }
}

type PaddleEvent = {
  name?: string
  data?: {
    transaction_id?: string
    id?: string
    transaction?: { id?: string }
  }
}

declare global {
  interface Window {
    Paddle?: PaddleCheckout
  }
}

let paddleReady: Promise<PaddleCheckout> | null = null
const seen = new Set<string>()

function transactionIdFromEvent(event: PaddleEvent): string {
  return String(
    event.data?.transaction_id ||
      event.data?.transaction?.id ||
      event.data?.id ||
      '',
  ).trim()
}

async function loadScript(): Promise<void> {
  if (document.querySelector('script[data-paddle-js]')) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.dataset.paddleJs = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Paddle checkout.'))
    document.head.appendChild(script)
  })
}

async function paddle(): Promise<PaddleCheckout> {
  if (!paddleConfigured()) {
    throw new Error('Paddle checkout is not connected.')
  }
  if (!paddleReady) {
    paddleReady = (async () => {
      await loadScript()
      const client = window.Paddle
      if (!client) throw new Error('Could not load Paddle checkout.')
      client.Environment.set('sandbox')
      client.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        checkout: {
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            locale: 'en',
          },
        },
        eventCallback: (event: PaddleEvent) => {
          if (event.name !== 'checkout.completed') return
          const transactionId = transactionIdFromEvent(event)
          if (!transactionId) return
          void fulfillPaddlePayment(transactionId)
        },
      })
      return client
    })()
  }
  return paddleReady
}

async function createTransaction(pack: CreditPack, email: string): Promise<{
  transactionId: string
  url: string | null
} | null> {
  const res = await fetch('/api/paddle/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packId: pack.id, email }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    transactionId?: string
    url?: string | null
  }
  if (!res.ok || !data.transactionId) return null
  return { transactionId: data.transactionId, url: data.url ?? null }
}

export async function openCreditCheckout(pack: CreditPack, email: string): Promise<void> {
  requireAccount()
  const client = await paddle()
  const started = await createTransaction(pack, email)
  if (started?.transactionId) {
    client.Checkout.open({ transactionId: started.transactionId })
    return
  }
  client.Checkout.open({
    items: [{ priceId: pack.priceId, quantity: 1 }],
    customer: { email },
    customData: { app: 'memorymap', packId: pack.id, email },
  })
}

export async function fulfillPaddlePayment(transactionId: string): Promise<boolean> {
  const id = transactionId.trim()
  if (!id || seen.has(id)) return false
  seen.add(id)
  try {
    requireAccount()
    const res = await fetch('/api/paddle/fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      packId?: string
      credits?: number
      email?: string
    }
    if (!res.ok) {
      seen.delete(id)
      throw new Error(data.error || 'Could not confirm that payment.')
    }
    const pack = packById(String(data.packId ?? ''))
    if (!pack) throw new Error('Could not match that payment to a credit pack.')
    applyCheckoutGrant(pack, id)
    setAccountNotice(
      `Added ${pack.credits} credit${pack.credits === 1 ? '' : 's'} from Paddle sandbox checkout.`,
    )
    return true
  } catch (err) {
    seen.delete(id)
    setAccountNotice(
      err instanceof Error ? err.message : 'Could not confirm that payment.',
    )
    return false
  }
}

export async function consumePaddleReturn(): Promise<boolean> {
  const url = new URL(window.location.href)
  const transactionId = (
    url.searchParams.get('paddle_txn') ||
    url.searchParams.get('_ptxn') ||
    url.searchParams.get('txn') ||
    ''
  ).trim()
  if (!transactionId) return false
  url.searchParams.delete('paddle_txn')
  url.searchParams.delete('_ptxn')
  url.searchParams.delete('txn')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  return fulfillPaddlePayment(transactionId)
}
