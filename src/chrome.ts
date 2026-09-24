export type ChromeLayer = 'account' | 'feedback'

const EVENT = 'memorymap:chrome'
const OPEN_EVENT = 'memorymap:chrome-open'

export function claimChrome(layer: ChromeLayer) {
  window.dispatchEvent(new CustomEvent<ChromeLayer>(EVENT, { detail: layer }))
}

export function onChromeClaim(self: ChromeLayer, close: () => void) {
  function handler(event: Event) {
    const which = (event as CustomEvent<ChromeLayer>).detail
    if (which !== self) close()
  }
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

/** Open a chrome layer (e.g. the account / sign-in panel). */
export function openChrome(layer: ChromeLayer) {
  window.dispatchEvent(new CustomEvent<ChromeLayer>(OPEN_EVENT, { detail: layer }))
}

export function onChromeOpen(self: ChromeLayer, open: () => void) {
  function handler(event: Event) {
    const which = (event as CustomEvent<ChromeLayer>).detail
    if (which === self) open()
  }
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
