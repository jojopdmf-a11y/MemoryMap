export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export async function publishSouvenir(html: string): Promise<string | null> {
  try {
    const res = await fetch('/api/souvenir', {
      method: 'POST',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { url?: string }
    if (!data.url) return null
    return new URL(data.url, window.location.origin).href
  } catch {
    return null
  }
}

function openHtmlTab(html: string): boolean {
  const tab = window.open('', '_blank')
  if (!tab) return false
  tab.document.open()
  tab.document.write(html)
  tab.document.close()
  return true
}

export function downloadText(
  text: string,
  filename: string,
  type = 'text/html;charset=utf-8',
): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.target = '_blank'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()

  const inFrame = (() => {
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  })()

  // Cloud Agent preview (and other sandboxed iframes) often ignore <a download>.
  // Opening the blob in a new tab still lets the user save the souvenir HTML.
  if (inFrame) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  window.setTimeout(
    () => {
      a.remove()
      URL.revokeObjectURL(url)
    },
    inFrame ? 60_000 : 2_000,
  )
}

export async function saveSouvenir(
  filename: string,
  build: (hostedUrl: string) => string,
): Promise<void> {
  const draft = build('')
  const hosted = await publishSouvenir(draft)
  const html = hosted ? build(hosted) : draft
  if (isAppleTouchDevice()) {
    if (hosted) {
      const opened = window.open(hosted, '_blank', 'noopener')
      if (!opened) window.location.assign(hosted)
      return
    }
    if (openHtmlTab(html)) return
  }
  downloadText(html, filename)
}
