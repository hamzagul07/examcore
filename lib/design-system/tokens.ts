/**
 * MarkScheme design system — single source of truth for tokens.
 * CSS custom properties in theme.css mirror these values for runtime theming.
 * Margin Notes: zen (paper light) · late-night (warm dark)
 */

export type EcTheme = 'late-night' | 'zen'

export const ecThemes = {
  'late-night': {
    canvas: '#14120d',
    surface: '#1e1b13',
    surfaceRaised: '#242016',
    border: '#322d1f',
    textPrimary: '#f0ead9',
    textSecondary: '#c4bba1',
    brand: '#00f5a0',
    brandMuted: 'rgba(0, 245, 160, 0.1)',
    brandGradient: 'linear-gradient(135deg, #00f5a0 0%, #1f8a8a 100%)',
    inkCrimson: '#e06c6c',
    pen: '#9eb0f5',
    paper: '#211e14',
    paperRule: '#383223',
    chipSuccess: { bg: 'rgba(0, 245, 160, 0.1)', text: '#00f5a0' },
    chipWarning: { bg: 'rgba(217, 179, 106, 0.14)', text: '#d9b36a' },
    chipCritical: { bg: 'rgba(224, 108, 108, 0.12)', text: '#e06c6c' },
    chipNeutral: { bg: 'rgba(131, 123, 100, 0.14)', text: '#837b64' },
    wireframeOpacity: 0,
    wireframeColor: '#00f5a0',
  },
  zen: {
    canvas: '#f8f9fa',
    surface: '#ffffff',
    surfaceRaised: '#f5f6f8',
    border: '#e5e7eb',
    textPrimary: '#25221b',
    textSecondary: '#5c5546',
    brand: '#19774d',
    brandMuted: 'rgba(30, 138, 94, 0.11)',
    brandGradient: 'linear-gradient(135deg, #19774d 0%, #17a86b 100%)',
    inkCrimson: '#b04848',
    pen: '#2b3a8c',
    paper: '#ffffff',
    paperRule: '#e8eaed',
    chipSuccess: { bg: 'rgba(30, 138, 94, 0.11)', text: '#19774d' },
    chipWarning: { bg: 'rgba(196, 168, 120, 0.2)', text: '#9a7a40' },
    chipCritical: { bg: 'rgba(176, 72, 72, 0.09)', text: '#b04848' },
    chipNeutral: { bg: 'rgba(241, 235, 221, 0.85)', text: '#8d8470' },
    wireframeOpacity: 0,
    wireframeColor: '#19774d',
  },
} as const

export const ecRadii = {
  card: '14px',
  button: '10px',
  pill: '999px',
  input: '10px',
  chip: '9999px',
} as const

export const ecMotion = {
  cardHover: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  buttonHover: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  themeTransition: '0ms',
} as const

export const ecTouch = {
  min: '44px',
} as const

export const ecZIndex = {
  sticky: 50,
  overlay: 60,
  modal: 90,
  toast: 100,
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
