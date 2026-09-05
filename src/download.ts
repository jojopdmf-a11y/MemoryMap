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
