import { CREDIT_PACKS } from '../commerce'
import { useAccount } from '../accountStore'

type Props = {
  canDownload: boolean
  alreadyOwned: boolean
  hint: string
  onBuy: () => void
  onDownload: () => void
}

export function CreditsDock({
  canDownload,
  alreadyOwned,
  hint,
  onBuy,
  onDownload,
}: Props) {
  const { account } = useAccount()
  const credits = account?.credits ?? 0

  return (
    <div className="credits-dock">
      <p className="credits-lead">
        Preview is free.{' '}
        {alreadyOwned
          ? 'This map is already on your account — download again is free.'
          : 'A new souvenir uses '}
        {!alreadyOwned && <strong>1 credit</strong>}
        {!alreadyOwned && account && ` · ${credits} remaining.`}
        {!alreadyOwned && !account && ' Sign in to buy a pack.'}
      </p>
      <ul className="pack-row">
        {CREDIT_PACKS.map((pack) => (
          <li key={pack.id}>
            <button type="button" className="pack-card" onClick={onBuy}>
              <strong>${pack.usd}</strong>
              <span>
                {pack.credits} map{pack.credits === 1 ? '' : 's'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="panel-actions">
        <button
          type="button"
          className="primary"
          disabled={!canDownload}
          onClick={onDownload}
        >
          Download map
        </button>
        <p className="hint">{hint}</p>
      </div>
    </div>
  )
}
