import { useEffect } from 'react'
import App from './App'
import { consumeSignInFromUrl } from './accountStore'
import { PreviewBanner } from './components/PreviewBanner'
import { PrivacyPage } from './components/PrivacyPage'
import { consumePaddleReturn } from './paddleCheckout'

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    void consumeSignInFromUrl().then(() => consumePaddleReturn())
  }, [])

  return (
    <>
      <PreviewBanner />
      {path === '/privacy' ? <PrivacyPage /> : <App />}
    </>
  )
}
