/**
 * Subject-aware technique packs for the Max Vault — blogs + tools that already
 * exist on MarkScheme. Original digests only; no copyrighted report text.
 */
import { isIbSubjectCode } from '@/lib/ib/marking-config'

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

/*
 * IB is a different qualification, not a different syllabus code.
 *
 * Every default below the per-code list was Cambridge — examiner reports,
 * Cambridge revision resources, marking Cambridge past papers — so an IB
 * student's technique pack was entirely wrong-board advice. Worse than empty:
 * it sends them to read about a marking system they are not sitting.
 *
 * These are the things that actually decide an IB grade and have no Cambridge
 * equivalent: the IA, the command terms, the /45 arithmetic that offers are
 * written in, and (this session) the move to digital exams.
 */
const IB_CORE_LINKS: TechniqueLink[] = [
  {
    label: 'IB command terms explained',
    href: '/blog/ib-command-terms-explained',
    note: 'Compare, contrast and distinguish are three different answers.',
  },
  {
    label: 'Internal Assessment — complete guide',
    href: '/blog/ib-internal-assessment-complete-guide',
    note: 'The coursework marks you can still change after exams.',
  },
  {
    label: 'IB grade boundaries explained',
    href: '/blog/ib-grade-boundaries-explained',
    note: 'Criterion bands, not raw-mark thresholds.',
  },
  {
    label: 'Points and university offers',
    href: '/blog/ib-points-and-university-offers-explained',
    note: 'What your subject grades become out of 45.',
  },
  {
    label: 'Digital exams 2026 — student guide',
    href: '/blog/ib-digital-exams-2026-student-guide',
    note: 'What changes when the paper is on screen.',
  },
  {
    label: 'IB revision strategy',
    href: '/blog/ib-exam-revision-strategy',
    note: 'Across six subjects, TOK, EE and CAS at once.',
  },
]

/** Diploma-wide extras — only worth the space for a full Diploma candidate. */
const IB_DIPLOMA_LINKS: TechniqueLink[] = [
  {
    label: 'Extended Essay — complete guide',
    href: '/blog/ib-extended-essay-complete-guide',
    note: 'Four thousand words and up to three points.',
  },
  {
    label: 'TOK essay guide',
    href: '/blog/ib-tok-essay-guide',
    note: 'The other half of the bonus points.',
  },
]

/**
 * IB subject stems that have the standard per-subject posts, verified against
 * content/blog. A stem is listed only when the file exists — a technique pack
 * that 404s is worse than a shorter one.
 */
const IB_STEM_HAS_SEVEN = new Set([
  'biology', 'business-management', 'chemistry', 'computer-science',
  'digital-society', 'economics', 'english-a', 'ess', 'geography',
  'global-politics', 'history', 'maths-aa', 'maths-ai', 'physics',
  'psychology', 'sehs',
])
const IB_STEM_HAS_IA = new Set([
  'biology', 'business-management', 'chemistry', 'computer-science',
  'economics', 'english-a', 'ess', 'geography', 'history', 'maths-aa',
  'maths-ai', 'physics', 'psychology',
])

/** `ib-computer-science-hl` → `computer-science`. */
function ibStem(subjectCode: string): string {
  return subjectCode.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')
}

function ibSubjectLinks(subjectCode: string): TechniqueLink[] {
  const stem = ibStem(subjectCode)
  const out: TechniqueLink[] = []
  if (IB_STEM_HAS_SEVEN.has(stem)) {
    out.push({
      label: 'How to get a 7',
      href: `/blog/ib-${stem}-how-to-get-a-7`,
      note: 'What separates a 6 from a 7 in this subject.',
    })
  }
  if (IB_STEM_HAS_IA.has(stem)) {
    out.push({
      label: 'IA guide',
      href: `/blog/ib-${stem}-ia-guide`,
      note: 'Criteria, structure, and where marks are lost.',
    })
    out.push({
      label: 'IA ideas',
      href: `/blog/ib-${stem}-ia-ideas`,
      note: 'Topics that are actually markable.',
    })
  }
  return out
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
  // An IB pack never falls back to the Cambridge defaults — see IB_CORE_LINKS.
  const links = isIbSubjectCode(code)
    ? [...ibSubjectLinks(code), ...IB_CORE_LINKS, ...IB_DIPLOMA_LINKS]
    : [...specific, HOW_TO_REPORTS, COMMAND_WORDS, ...DEFAULT_LINKS]
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
