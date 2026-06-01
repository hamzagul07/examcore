/**
 * Examcore design system — single source of truth for tokens.
 * CSS custom properties in theme.css mirror these values for runtime theming.
 */

export type EcTheme = 'late-night' | 'zen'

export const ecThemes = {
  'late-night': {
    canvas: '#0a0b0f',
    surface: '#14161c',
    surfaceRaised: '#1a1d26',
    border: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    brand: '#00f5a0',
    brandMuted: 'rgba(0, 245, 160, 0.15)',
    brandGradient: 'linear-gradient(135deg, #00f5a0 0%, #34d399 50%, #6ee7b7 100%)',
    inkCrimson: '#ff4b6e',
    chipSuccess: { bg: 'rgba(0, 245, 160, 0.15)', text: '#00f5a0' },
    chipWarning: { bg: 'rgba(255, 176, 32, 0.15)', text: '#ffb020' },
    chipCritical: { bg: 'rgba(255, 75, 110, 0.15)', text: '#ff4b6e' },
    chipNeutral: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8' },
    wireframeOpacity: 0.09,
    wireframeColor: '#00f5a0',
  },
  zen: {
    canvas: '#f5f0e8',
    surface: '#faf7f2',
    surfaceRaised: '#fffdf9',
    border: 'rgba(90, 80, 60, 0.12)',
    textPrimary: '#000000',
    textSecondary: '#333333',
    brand: '#5a9a6a',
    brandMuted: 'rgba(90, 154, 106, 0.12)',
    brandGradient: 'linear-gradient(135deg, #5a9a6a 0%, #7ab88a 50%, #a8c5a0 100%)',
    inkCrimson: '#a85c5c',
    chipSuccess: { bg: 'rgba(90, 154, 106, 0.15)', text: '#4a7a54' },
    chipWarning: { bg: 'rgba(196, 168, 120, 0.2)', text: '#9a7a40' },
    chipCritical: { bg: 'rgba(168, 92, 92, 0.15)', text: '#a85c5c' },
    chipNeutral: { bg: 'rgba(122, 114, 104, 0.12)', text: '#7a7268' },
    wireframeOpacity: 0.04,
    wireframeColor: '#5a9a6a',
  },
} as const

export const ecRadii = {
  card: '16px',
  button: '12px',
  input: '12px',
  chip: '9999px',
} as const

export const ecMotion = {
  cardHover: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  buttonHover: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  themeTransition: '500ms ease',
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
    fontFamily: 'var(--font-sans)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1.05,
  },
  question: {
    fontFamily: 'var(--font-fraunces)',
    fontWeight: 500,
    lineHeight: 1.55,
  },
} as const

export const EC_THEME_STORAGE_KEY = 'ec-theme'

export type EcThemeTokens = (typeof ecThemes)[EcTheme]
