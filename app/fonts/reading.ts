import localFont from 'next/font/local'

/**
 * Reading typefaces for course lessons — loaded only under the course
 * routes, not site-wide. Self-hosted for the same reason as the brand fonts
 * in app/layout.tsx (a build must not depend on a fetch from Google); the
 * files are the latin woff2 subsets Google serves, unmodified, OFL-licensed
 * (app/fonts/files/OFL.txt).
 *
 * Why three, and why these — see docs/COURSE_TYPOGRAPHY.md. In short: the
 * best-controlled study of screen reading found no single fastest font and a
 * 35% spread between an individual's best and worst, so the reader chooses;
 * the default is the one that scored best on speed and comprehension
 * together across sixteen candidates.
 *
 *   Literata                  default, "Book" — Google Play Books' reading
 *                             serif, with an optical-size axis so small text
 *                             keeps its strokes; sits well beside KaTeX maths
 *                             and makes a lesson read like a set textbook
 *   Noto Sans                 "Sans" — generous x-height, open apertures, low
 *                             contrast; designed for small screens
 *   Atkinson Hyperlegible Next "Clear" — letterforms designed to stay
 *                             distinct (Il1, O0, ce) for low vision and for
 *                             readers who lose their place
 *
 * Only the default (Literata, the book face) is preloaded. The others
 * declare their @font-face and the browser fetches a file the first time a
 * page actually uses it.
 * `adjustFontFallback` makes next/font generate a size-adjusted fallback
 * face, so the lines a reader is already on do not reflow when the real
 * file lands (display: swap).
 */

export const readingSans = localFont({
  src: [
    { path: './files/noto-sans.woff2', weight: '400 700', style: 'normal' },
    { path: './files/noto-sans-italic.woff2', weight: '400 700', style: 'italic' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  variable: '--font-reading-sans',
  fallback: ['Instrument Sans', 'system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
})

export const readingSerif = localFont({
  src: [
    { path: './files/literata.woff2', weight: '400 700', style: 'normal' },
    { path: './files/literata-italic.woff2', weight: '400 700', style: 'italic' },
  ],
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-reading-serif',
  fallback: ['Georgia', 'Iowan Old Style', 'Palatino', 'serif'],
})

export const readingClear = localFont({
  src: [{ path: './files/atkinson-hyperlegible-next.woff2', weight: '400 700', style: 'normal' }],
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  variable: '--font-reading-clear',
  fallback: ['Verdana', 'system-ui', 'sans-serif'],
})

/** Put on the element that wraps lesson pages so the CSS variables resolve. */
export const readingFontsClassName = `${readingSans.variable} ${readingSerif.variable} ${readingClear.variable}`
