type Props = {
  canDownload: boolean
  hint: string
  onDownload: () => void
}

export function CreditsDock({ canDownload, hint, onDownload }: Props) {
  return (
    <div className="credits-dock">
      <p className="credits-lead">
        Download is free in this public preview. Sign in to keep a list in this
        browser so you can download a map again. On a phone or tablet, Download
        opens the map in a new tab. Tap Share or Copy link there to bookmark or
        send it.
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
