import App from './App'
import { PrivacyPage } from './components/PrivacyPage'

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/privacy') return <PrivacyPage />
  return <App />
}
