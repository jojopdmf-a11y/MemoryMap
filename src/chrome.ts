export type ChromeLayer = 'account' | 'feedback'

const EVENT = 'memorymap:chrome'

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
