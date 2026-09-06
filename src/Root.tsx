import App from './App'
import { PreviewBanner } from './components/PreviewBanner'
import { PrivacyPage } from './components/PrivacyPage'

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return (
    <>
      <PreviewBanner />
      {path === '/privacy' ? <PrivacyPage /> : <App />}
    </>
  )
}
