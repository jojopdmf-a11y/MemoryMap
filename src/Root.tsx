import { useEffect } from 'react'
import App from './App'
import { consumeSignInFromUrl } from './accountStore'
import { PreviewBanner } from './components/PreviewBanner'
import { PrivacyPage } from './components/PrivacyPage'

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    void consumeSignInFromUrl()
  }, [])

  return (
    <>
      <PreviewBanner />
      {path === '/privacy' ? <PrivacyPage /> : <App />}
    </>
  )
}
