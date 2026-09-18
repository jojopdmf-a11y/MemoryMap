import { useEffect } from 'react'
import App from './App'
import { consumeSignInFromUrl } from './accountStore'
import { LandingPreview } from './components/LandingPreview'
import { PreviewBanner } from './components/PreviewBanner'
import { PrivacyPage } from './components/PrivacyPage'
import { bootPaddleFromUrl } from './paddleCheckout'

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const layoutPreview = path === '/landing-preview'

  useEffect(() => {
    void consumeSignInFromUrl().then(() => bootPaddleFromUrl())
  }, [])

  return (
    <>
      {!layoutPreview && <PreviewBanner />}
      {path === '/privacy' ? (
        <PrivacyPage />
      ) : layoutPreview ? (
        <LandingPreview />
      ) : (
        <App />
      )}
    </>
  )
}
