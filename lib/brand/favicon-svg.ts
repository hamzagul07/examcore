/** Brand colours for favicon / PWA (fixed hex — not CSS variables). */
export const FAVICON = {
  bg: '#0c1219',
  paper: '#1a2332',
  brand: '#00f5a0',
  pencil: '#64748b',
  ink: '#f43f5e',
  border: '#0d9488',
} as const

/** Paper + examiner tick — matches MarkSchemeLogoMark. */
export function faviconSvgMarkup(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10" fill="${FAVICON.bg}"/>
  <g transform="rotate(-5 24 24)">
    <path d="M11 10.5 H31.5 C33.4 10.5 35 12.1 35 14 V31.5 C35 33.4 33.4 35 31.5 35 H17 L11 40.5 V35 C9.1 35 7.5 33.4 7.5 31.5 V14 C7.5 12.1 9.1 10.5 11 10.5 Z" fill="${FAVICON.paper}" stroke="${FAVICON.brand}" stroke-width="1.75" stroke-linejoin="round"/>
    <path d="M29.5 10.5 H33.5 V15.5 L29.5 10.5 Z" fill="#0f2922" stroke="${FAVICON.brand}" stroke-width="1.25" stroke-linejoin="round"/>
    <path d="M14.5 19 H30 M14.5 23.5 H26" stroke="${FAVICON.pencil}" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
    <path d="M14 27.5 C16.8 33.2 20.8 32 24.2 29.2 C27.8 26.2 32 21.2 36.2 16" stroke="${FAVICON.brand}" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="37" cy="15" r="2.25" fill="${FAVICON.ink}"/>
  </g>
</svg>`
}

export function faviconDataUrl(): string {
  return `data:image/svg+xml,${encodeURIComponent(faviconSvgMarkup())}`
}
