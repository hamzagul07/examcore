/**
 * Generic shareable tool slip — Copy / Share / WhatsApp for Results Day tools.
 */

export function buildToolSlipText(lines: Array<string | null | undefined>): string {
  return lines.filter(Boolean).join('\n')
}

export function shareToolSlipWhatsApp(text: string): void {
  if (typeof window === 'undefined') return
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer',
  )
}

export async function shareToolSlipNative(
  text: string,
  title: string,
  url?: string,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  try {
    await navigator.share({
      title,
      text,
      ...(url ? { url } : {}),
    })
    return true
  } catch {
    return false
  }
}

export async function copyToolSlipText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
