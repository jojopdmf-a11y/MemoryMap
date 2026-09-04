type Variant = 'leaderboard' | 'inline' | 'footer'

const COPY: Record<Variant, { size: string; note: string }> = {
  leaderboard: { size: '728 × 90', note: 'Top of page · later a rotating sponsor' },
  inline: { size: '300 × 250', note: 'Beside the form · later a related-travel unit' },
  footer: { size: '728 × 90', note: 'End of page · later a quiet house ad' },
}

export function AdSlot({ variant }: { variant: Variant }) {
  const spec = COPY[variant]
  return (
    <aside className={`ad-slot ad-slot-${variant}`} aria-hidden="true">
      <span className="ad-kicker">Reserved for advertising</span>
      <span className="ad-size">{spec.size}</span>
      <span className="ad-note">{spec.note}</span>
    </aside>
  )
}
