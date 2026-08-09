/**
 * MarkScheme design system — typed mirror of runtime CSS tokens in theme.css.
 * Keep values in lockstep with [data-ec-theme] rules (DS-01). When they diverge,
 * theme.css wins at runtime; update this file in the same change.
 * Margin Notes: zen (paper light) · late-night (warm dark)
 */

export type EcTheme = 'late-night' | 'zen'

export const ecThemes = {
  'late-night': {
    canvas: '#14120d',
    bgSoft: '#1a1711',
    surface: '#1e1b13',
    surfaceRaised: '#242016',
    surfaceMuted: '#1a1711',
    border: '#3a3421',
    borderSoft: '#322d1f',
    textPrimary: '#f0ead9',
    textSecondary: '#c4bba1',
    /** AA normal-text floor on paper (~4.6:1) — DS-02 */
    textFaint: '#b0a68c',
    brand: '#00f5a0',
    brandMuted: 'rgba(0, 245, 160, 0.1)',
    brandGradient: 'linear-gradient(135deg, #00f5a0 0%, #1a7575 100%)',
    inkCrimson: '#e06c6c',
    logoCrimson: '#bb2a25',
    pen: '#9eb0f5',
    paper: '#211e14',
    paperRule: '#383223',
    chipSuccess: { bg: 'rgba(0, 245, 160, 0.1)', text: '#00f5a0' },
    chipWarning: { bg: 'rgba(217, 179, 106, 0.14)', text: '#d9b36a' },
    chipCritical: { bg: 'rgba(224, 108, 108, 0.12)', text: '#e06c6c' },
    chipNeutral: { bg: 'rgba(131, 123, 100, 0.14)', text: '#b0a68c' },
    wireframeOpacity: 0,
    wireframeColor: '#00f5a0',
  },
  zen: {
    canvas: '#faf9f6',
    bgSoft: '#f3f1ea',
    surface: '#ffffff',
    surfaceRaised: '#f6f4ee',
    surfaceMuted: '#f0ede5',
    border: '#e7e3d8',
    borderSoft: '#eae6dc',
    textPrimary: '#25221b',
    textSecondary: '#5c5546',
    /** AA normal-text floor on white/paper (~4.7:1) — DS-02 */
    textFaint: '#6a634f',
    brand: '#19774d',
    brandDeep: '#12603f',
    brandMuted: 'rgba(25, 119, 77, 0.06)',
    brandGradient: 'linear-gradient(135deg, #19774d 0%, #17a86b 100%)',
    inkCrimson: '#a23e3e',
    logoCrimson: '#bb2a25',
    pen: '#2b3a8c',
    paper: '#ffffff',
    paperRule: '#eae6dc',
    chipSuccess: { bg: 'rgba(30, 138, 94, 0.11)', text: '#19774d' },
    chipWarning: { bg: 'rgba(196, 168, 120, 0.16)', text: '#735829' },
    chipCritical: { bg: 'rgba(176, 72, 72, 0.09)', text: '#a23e3e' },
    chipNeutral: { bg: 'rgba(240, 236, 228, 0.9)', text: '#6a634f' },
    wireframeOpacity: 0,
    wireframeColor: '#19774d',
  },
} as const

/** Stamp geometry — Examiner's Ink desk language (not soft SaaS pills). */
export const ecRadii = {
  card: '4px',
  button: '4px',
  lg: '4px',
  pill: '4px',
  input: '4px',
  chip: '4px',
} as const

export const ecMotion = {
  cardHover: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  buttonHover: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  themeTransition: '0ms',
} as const

export const ecTouch = {
  min: '44px',
} as const

/** Mirrors --ec-z-* in theme.css */
export const ecZIndex = {
  sticky: 50,
  overlay: 60,
  toast: 100,
  modal: 250,
} as const

export const ecTypography = {
  display: {
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    letterSpacing: '-0.025em',
    lineHeight: 1.04,
  },
  question: {
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    lineHeight: 1.55,
  },
} as const

export const EC_THEME_STORAGE_KEY = 'ec-theme'

export type EcThemeTokens = (typeof ecThemes)[EcTheme]
