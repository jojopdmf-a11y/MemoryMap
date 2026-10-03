import type { ReactNode } from 'react'
import { SITE_NAME } from '../site'
import { AccountMenu } from './AccountMenu'
import { SiteFooter } from './SiteFooter'

type Props = {
  kicker: string
  title: string
  children: ReactNode
}

/** Shared chrome for /privacy and /terms. */
export function LegalShell({ kicker, title, children }: Props) {
  return (
    <div className="app is-legal">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="kicker">
            <a href="/">{SITE_NAME}</a>
          </p>
          <p className="tagline">Visualize Your Voyages, Treasure Your Travels.</p>
        </div>
        <div className="topbar-tools">
          <a className="ghost" href="/guides/">
            Guides
          </a>
          <AccountMenu />
        </div>
      </header>
      <main className="legal">
        <p className="legal-kicker">{kicker}</p>
        <h1>{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
