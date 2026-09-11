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
        Mapping and Play stay free.{' '}
        {account
          ? `Keeping a map on your account uses 1 credit. You have ${credits} credit${credits === 1 ? '' : 's'}.${PADDLE_SANDBOX && credits < 1 ? ' You can add preview credits at no charge.' : ''}`
          : PADDLE_SANDBOX
            ? 'During this public preview, download is free. Sign in only if you want the map saved on your account.'
            : 'Sign in to keep a file. Keeping the souvenir file uses 1 credit.'}{' '}
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
