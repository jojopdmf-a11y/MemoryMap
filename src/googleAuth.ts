import { redeemGoogleAccessToken } from './authApi'
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

async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGoogleScript()
  const api = window.google?.accounts?.oauth2
  if (!api) {
    throw new Error('Google sign-in is not available in this browser.')
  }
  return new Promise((resolve, reject) => {
    const client = api.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Google sign-in was cancelled.'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export async function continueWithGoogle(clientId?: string): Promise<void> {
  const id = (clientId ?? googleClientId()).trim()
  if (!id) {
    throw new Error(
      'Google sign-in needs a one-time client ID. Until that’s added, use email.',
    )
  }
  const accessToken = await requestGoogleAccessToken(id)
  const email = await redeemGoogleAccessToken(accessToken)
  signInWithEmail(email)
}
