import {
  applyPurchase,
  hasKeptFingerprint,
  keepMap,
  type LedgerEnv,
} from '../worker/ledger.ts'

const store = new Map<string, string>()

const env: LedgerEnv = {
  SOUVENIRS: {
    async get(key) {
      return store.get(key) ?? null
    },
    async put(key, value) {
      store.set(key, value)
    },
  },
}

async function main() {
  const email = 'tester@memorymap.world'
  const fingerprint = 'abc123'
  const recipe = { title: 'Test trip' }

  try {
    await keepMap(env, email, {
      fingerprint,
      title: 'Test trip',
      filename: 'MemoryMap-trip.html',
      recipe,
    })
    throw new Error('keepMap should require credits')
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code !== 'need_credits') throw err
  }

  await applyPurchase(env, email, {
    id: 'txn_test1',
    packId: 'starter',
    credits: 3,
    usd: 5,
    createdAt: new Date().toISOString(),
  })
  await applyPurchase(env, email, {
    id: 'txn_test1',
    packId: 'starter',
    credits: 3,
    usd: 5,
    createdAt: new Date().toISOString(),
  })

  const first = await keepMap(env, email, {
    fingerprint,
    title: 'Test trip',
    filename: 'MemoryMap-trip.html',
    recipe,
  })
  if (!first.spent || first.account.credits !== 2) {
    throw new Error(`first keep expected spend, credits 2, got ${JSON.stringify(first)}`)
  }

  const again = await keepMap(env, email, {
    fingerprint,
    title: 'Test trip',
    filename: 'MemoryMap-trip.html',
    recipe,
  })
  if (again.spent || again.account.credits !== 2) {
    throw new Error(`redownload should be free, got ${JSON.stringify(again)}`)
  }

  const changed = await keepMap(env, email, {
    fingerprint: 'def456',
    title: 'Changed trip',
    filename: 'MemoryMap-trip.html',
    recipe: { title: 'Changed trip' },
  })
  if (!changed.spent || changed.account.credits !== 1) {
    throw new Error(`changed map should spend, got ${JSON.stringify(changed)}`)
  }

  if (!(await hasKeptFingerprint(env, email, fingerprint))) {
    throw new Error('original fingerprint should remain in the library')
  }
  if (await hasKeptFingerprint(env, email, 'missing')) {
    throw new Error('unknown fingerprint should not be kept')
  }

  console.log('ledger check ok')
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
