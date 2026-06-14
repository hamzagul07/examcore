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

/** App icon / favicon — centered M with crimson dot after the letter (wordmark lockup). */
export function faviconSvgMarkup(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" role="img" aria-label="MarkScheme">
  <rect width="48" height="48" rx="11" fill="${LOGO_COLORS.bg}"/>
  <rect x="1" y="1" width="46" height="46" rx="10" stroke="${LOGO_COLORS.brand}" stroke-width="0.75" opacity="0.18"/>
  <text x="24" y="32" text-anchor="middle" dominant-baseline="middle" font-family="Newsreader, Georgia, 'Times New Roman', serif" font-size="25" font-weight="600" letter-spacing="-0.02em">
    <tspan fill="${LOGO_COLORS.ink}">M</tspan><tspan fill="${LOGO_COLORS.brand}">.</tspan>
  </text>
</svg>`
}

export function faviconDataUrl(): string {
  return `data:image/svg+xml,${encodeURIComponent(faviconSvgMarkup())}`
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
