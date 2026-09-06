type Props = {
  canDownload: boolean
  hint: string
  onDownload: () => void
}

export function CreditsDock({ canDownload, hint, onDownload }: Props) {
  return (
    <div className="credits-dock">
      <p className="credits-lead">
        Download is free in this public preview. No sign-in and no credit pack.
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
