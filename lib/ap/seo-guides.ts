/** AP College Board hub guides. */

export const AP_CALCULUS_AB_FRQ_GUIDE =
  '/blog/ap-calculus-ab-frq-marking-guide-2026' as const

export const AP_HUB_GUIDE_LINKS = [
  { href: AP_CALCULUS_AB_FRQ_GUIDE, label: 'Calculus AB FRQ marking' },
  { href: '/ap/physics-1', label: 'Physics 1 hub' },
  { href: '/ap/score-calculator', label: '1–5 score calculator (soon)' },
  { href: '/mark?board=ap&subject=ap-calculus-ab', label: 'Mark Calculus AB FRQ' },
] as const
