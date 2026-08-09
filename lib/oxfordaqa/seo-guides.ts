/**
 * OxfordAQA hub guides (acquisition). Marking CTAs use oxaqa content codes.
 */

export const OXFORD_AQA_MATHS_GUIDE =
  '/blog/oxfordaqa-international-a-level-mathematics-guide-2026' as const

export const OXFORD_AQA_PHYSICS_GUIDE =
  '/blog/oxfordaqa-international-a-level-physics-guide-2026' as const

export const OXFORD_AQA_CHEMISTRY_GUIDE =
  '/blog/oxfordaqa-international-a-level-chemistry-guide-2026' as const

export const OXFORD_AQA_BIOLOGY_GUIDE =
  '/blog/oxfordaqa-international-a-level-biology-guide-2026' as const

export const OXFORD_AQA_VS_CAMBRIDGE_GUIDE =
  '/blog/edexcel-ial-vs-cambridge-a-level-2026' as const

export const OXFORD_AQA_HUB_GUIDE_LINKS = [
  { href: OXFORD_AQA_MATHS_GUIDE, label: 'OxfordAQA Maths overview' },
  { href: OXFORD_AQA_PHYSICS_GUIDE, label: 'OxfordAQA Physics' },
  { href: OXFORD_AQA_CHEMISTRY_GUIDE, label: 'OxfordAQA Chemistry' },
  { href: OXFORD_AQA_BIOLOGY_GUIDE, label: 'OxfordAQA Biology' },
  { href: OXFORD_AQA_VS_CAMBRIDGE_GUIDE, label: 'International boards compared' },
  { href: '/edexcel', label: 'Edexcel IAL hub' },
  { href: '/mark?board=oxfordaqa&subject=oxaqa-mathematics', label: 'Mark OxfordAQA Maths' },
] as const
