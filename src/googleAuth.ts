import { googleClientId } from './commerce'
import { signInWithEmail } from './accountStore'

type GoogleTokenClient = {
  requestAccessToken: () => void
}

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string
      scope: string
      callback: (response: { access_token?: string; error?: string }) => void
    }) => GoogleTokenClient
  }
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Google sign-in.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function continueWithGoogle(): Promise<void> {
  const clientId = googleClientId()
  if (!clientId) {
    throw new Error('Google sign-in is not configured yet.')
  }
  await loadGoogleScript()
  const api = window.google?.accounts?.oauth2
  if (!api) {
    throw new Error('Google sign-in is not available in this browser.')
  }
  await new Promise<void>((resolve, reject) => {
    const client = api.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Google sign-in was cancelled.'))
          return
        }
        void fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Google did not return a profile.')
            return res.json() as Promise<{ email?: string }>
          })
          .then((profile) => {
            if (!profile.email) throw new Error('Google did not share an email.')
            signInWithEmail(profile.email)
            resolve()
          })
          .catch((err) => {
            reject(err instanceof Error ? err : new Error('Google sign-in failed.'))
          })
      },
    })
    client.requestAccessToken()
  })
}
