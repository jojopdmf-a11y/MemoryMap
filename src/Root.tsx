import { useEffect } from 'react'
import App from './App'
import { consumeSignInFromUrl } from './accountStore'
import { PreviewBanner } from './components/PreviewBanner'
import { PrivacyPage } from './components/PrivacyPage'
import { TermsPage } from './components/TermsPage'
import { bootPaddleFromUrl } from './paddleCheckout'

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    void consumeSignInFromUrl().then(() => bootPaddleFromUrl())
  }, [])

  let page = <App />
  if (path === '/privacy') page = <PrivacyPage />
  else if (path === '/terms') page = <TermsPage />

  return (
    <>
      <PreviewBanner />
      {page}
    </>
  )
}
