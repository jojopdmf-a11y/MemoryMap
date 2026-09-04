import { CREDIT_PACKS } from '../commerce'

type Props = {
  canDownload: boolean
  hint: string
  onDownload: () => void
}

export function CreditsDock({ canDownload, hint, onDownload }: Props) {
  return (
    <div className="credits-dock">
      <p className="credits-lead">
        Preview is free. A download will later use <strong>1 credit</strong>.
      </p>
      <ul className="pack-row">
        {CREDIT_PACKS.map((pack) => (
          <li key={pack.id}>
            <button type="button" className="pack-card" disabled>
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
