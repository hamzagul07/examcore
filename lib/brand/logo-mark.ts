import fs from 'node:fs'
import path from 'node:path'

/** Shared MarkScheme logo colours (fixed hex — not CSS variables). */
export const LOGO_COLORS = {
  bg: '#f7f2e7',
  paper: '#fffdf7',
  paperFold: '#f3e8e6',
  brand: '#bb2a25',
  brandDeep: '#8f1f1c',
  pencil: '#8a7f70',
  ink: '#211c17',
} as const

/** Paper script + examiner tick — canonical brand mark at any size. */
export function logoMarkSvgInner(): string {
  return `<g transform="translate(4 3)">
    <path d="M2 2.5 H18.5 C19.88 2.5 21 3.62 21 5 V19.5 C21 20.88 19.88 22 18.5 22 H7.5 L2 26.5 V22 C0.62 22 -0.5 20.88 -0.5 19.5 V5 C-0.5 3.62 0.62 2.5 2 2.5 Z" fill="${LOGO_COLORS.paper}" stroke="${LOGO_COLORS.brand}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M15.5 2.5 H19.5 V7 L15.5 2.5 Z" fill="${LOGO_COLORS.paperFold}" stroke="${LOGO_COLORS.brand}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M4.5 10.5 H16 M4.5 13.5 H13" stroke="${LOGO_COLORS.pencil}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <path d="M4.2 17.2 L8.2 21.2 L17.8 10.2" stroke="${LOGO_COLORS.brand}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="18.4" cy="9.6" r="1.6" fill="${LOGO_COLORS.brand}"/>
  </g>`
}

/** Inline mark (transparent background) for headers and wordmark. */
export function logoMarkSvgMarkup(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="MarkScheme">
  ${logoMarkSvgInner()}
</svg>`
}

/** Public favicon paths (static assets in app/ and public/). */
export const FAVICON_PATHS = {
  tab: '/icon',
  apple: '/apple-icon',
  pwa: '/favicon.png',
  large: '/icon-512.png',
} as const

let cachedFaviconDataUrl: string | undefined

/** Data URL for OG images and other server-rendered contexts. */
export function faviconDataUrl(): string {
  if (cachedFaviconDataUrl) return cachedFaviconDataUrl
  const file = path.join(process.cwd(), 'app', 'apple-icon.png')
  const buf = fs.readFileSync(file)
  cachedFaviconDataUrl = `data:image/png;base64,${buf.toString('base64')}`
  return cachedFaviconDataUrl
}

export function logoMarkDataUrl(): string {
  return `data:image/svg+xml,${encodeURIComponent(logoMarkSvgMarkup())}`
}

/** @deprecated Use LOGO_COLORS — kept for icon routes. */
export const FAVICON = {
  bg: LOGO_COLORS.bg,
  paper: LOGO_COLORS.paper,
  brand: LOGO_COLORS.brand,
  pencil: LOGO_COLORS.pencil,
  ink: LOGO_COLORS.brand,
  border: LOGO_COLORS.brand,
} as const
