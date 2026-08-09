/** UK AQA hub guides. */

export const AQA_MATHS_MARKING_GUIDE =
  '/blog/aqa-a-level-mathematics-marking-guide-2026' as const

export const AQA_HUB_GUIDE_LINKS = [
  { href: AQA_MATHS_MARKING_GUIDE, label: 'AQA Maths marking' },
  { href: '/aqa/a-level/physics', label: 'AQA Physics hub' },
  { href: '/edexcel/a-level', label: 'Edexcel UK A Level' },
  { href: '/edexcel', label: 'Edexcel IAL (international)' },
  { href: '/mark?board=aqa&subject=aqa-mathematics', label: 'Mark AQA Maths' },
] as const
