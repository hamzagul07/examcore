/**
 * Subject-aware technique packs for the Max Vault — blogs + tools that already
 * exist on MarkScheme. Original digests only; no copyrighted report text.
 */

export type TechniqueLink = {
  label: string
  href: string
  note?: string
}

export type TechniquePack = {
  subjectCode: string
  title: string
  links: TechniqueLink[]
}

const HOW_TO_REPORTS: TechniqueLink = {
  label: 'How to use Cambridge examiner reports',
  href: '/blog/cambridge-examiner-report-how-to-use',
  note: 'Turn report language into marks on the page.',
}

const COMMAND_WORDS: TechniqueLink = {
  label: 'Command words tool',
  href: '/tools/command-words',
  note: 'What each exam verb actually demands.',
}

const BY_CODE: Record<string, TechniqueLink[]> = {
  '9709': [
    {
      label: 'Examiner report: 9709 Mathematics',
      href: '/blog/cambridge-examiner-report-9709-mathematics',
    },
    {
      label: 'Most-repeated maths topics',
      href: '/blog/most-repeated-cambridge-maths-past-paper-topics-2026',
    },
    {
      label: 'Best free A-Level Maths resources',
      href: '/blog/best-free-a-level-maths-resources-2026',
    },
  ],
  '9702': [
    {
      label: 'Examiner report: 9702 Physics',
      href: '/blog/cambridge-examiner-report-9702-physics',
    },
    {
      label: 'Most-repeated science topics',
      href: '/blog/most-repeated-cambridge-science-past-paper-topics-2026',
    },
    {
      label: 'Best free A-Level Physics resources',
      href: '/blog/best-free-a-level-physics-resources-2026',
    },
  ],
  '9700': [
    {
      label: 'Most-repeated science topics',
      href: '/blog/most-repeated-cambridge-science-past-paper-topics-2026',
    },
    {
      label: 'Best free A-Level Biology resources',
      href: '/blog/best-free-a-level-biology-resources-2026',
    },
  ],
  '9708': [
    {
      label: 'Examiner report: 9708 Economics',
      href: '/blog/cambridge-examiner-report-9708-economics',
    },
    {
      label: 'Most-repeated economics topics',
      href: '/blog/most-repeated-cambridge-economics-past-paper-topics-2026',
    },
  ],
  '9706': [
    {
      label: 'How to get an A* in 9706 Accounting',
      href: '/blog/how-to-get-an-a-star-in-cambridge-9706-accounting',
    },
    {
      label: 'Most-repeated accounting topics',
      href: '/blog/most-repeated-cambridge-accounting-past-paper-topics-2026',
    },
    {
      label: '9706 command words',
      href: '/blog/cambridge-9706-accounting-command-words-guide',
    },
  ],
  '9618': [
    {
      label: 'Most-repeated computer science topics',
      href: '/blog/most-repeated-cambridge-computer-science-past-paper-topics-2026',
    },
  ],
  '9609': [
    {
      label: 'Most-repeated business topics',
      href: '/blog/most-repeated-cambridge-business-past-paper-topics-2026',
    },
  ],
  '9990': [
    {
      label: 'Most-repeated psychology topics',
      href: '/blog/most-repeated-cambridge-psychology-past-paper-topics-2026',
    },
  ],
  '9696': [
    {
      label: 'Most-repeated geography topics',
      href: '/blog/most-repeated-cambridge-geography-past-paper-topics-2026',
    },
  ],
  '9489': [
    {
      label: 'Most-repeated history topics',
      href: '/blog/most-repeated-cambridge-history-past-paper-topics-2026',
    },
  ],
  '9084': [
    {
      label: 'Most-repeated law topics',
      href: '/blog/most-repeated-cambridge-law-past-paper-topics-2026',
    },
  ],
}

const DEFAULT_LINKS: TechniqueLink[] = [
  {
    label: 'Best free Cambridge revision resources',
    href: '/blog/best-free-cambridge-revision-resources-2026',
  },
  {
    label: 'How to mark past papers yourself',
    href: '/blog/how-to-mark-cambridge-past-papers-yourself',
  },
]

export function getTechniquePack(subjectCode: string | null | undefined): TechniquePack | null {
  if (!subjectCode) return null
  const code = subjectCode.trim()
  const specific = BY_CODE[code] ?? []
  const links = [...specific, HOW_TO_REPORTS, COMMAND_WORDS, ...DEFAULT_LINKS]
  // Dedupe by href
  const seen = new Set<string>()
  const deduped = links.filter((l) => {
    if (seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })
  return {
    subjectCode: code,
    title: `${code} technique pack`,
    links: deduped,
  }
}
