import { useAccount } from '../accountStore'
import { PADDLE_SANDBOX } from '../commerce'

type Props = {
  canDownload: boolean
  hint: string
  onDownload: () => void
}

export function CreditsDock({ canDownload, hint, onDownload }: Props) {
  const { account } = useAccount()
  const credits = account?.credits ?? 0
  return (
    <div className="credits-dock">
      <p className="credits-lead">
        Mapping and Play stay free. Keeping the souvenir file uses 1 credit.
        The same trip and style can be downloaded again for free.
        {account
          ? ` You have ${credits} credit${credits === 1 ? '' : 's'}.${PADDLE_SANDBOX && credits < 1 ? ' During this preview you can add credits at no charge.' : ''}`
          : PADDLE_SANDBOX
            ? ' Sign in to keep a file. During this preview, credits are free to add.'
            : ' Sign in to keep a file.'}{' '}
        On a phone or tablet, Download opens the map in a new tab. Tap Share or
        Copy link there to bookmark or send it.
      </p>
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
