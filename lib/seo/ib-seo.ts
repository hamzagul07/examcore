import { type IbSubject, ibYearRange } from '@/lib/ib/catalog'

/** Compact display names so SERP titles fit ~60 chars; full names used in body. */
const SHORT_NAME: Record<string, string> = {
  'maths-aa': 'Maths AA',
  'maths-ai': 'Maths AI',
  'english-a-lang-lit': 'English Lang & Lit',
  'english-a-literature': 'English Literature',
  'environmental-systems-and-societies': 'ESS',
}

export function ibShortName(subject: IbSubject): string {
  const base = subject.slug.replace(/-(hl|sl)$/, '')
  return SHORT_NAME[base] ?? subject.name
}

export function buildIbSubjectCopy(subject: IbSubject) {
  const short = ibShortName(subject)
  const range = ibYearRange()
  const papers = subject.papers.join(', ')
  const title = `IB ${short} ${subject.level} Past Papers`
  const description = `Browse IB Diploma ${subject.name} ${subject.level} past papers and mark schemes (${range}) by session and paper. Markband guides, exam tips and revision help — free on MarkScheme.`
  return {
    short,
    title,
    description,
    path: `/ib/subjects/${subject.slug}`,
    keywords: [
      `IB ${subject.name} ${subject.level}`,
      `IB ${short} past papers`,
      `IB ${subject.name} past papers`,
      `IB ${subject.name} mark scheme`,
      `IB ${subject.name} ${subject.level} ${subject.papers[1] ?? 'paper 2'}`,
      `${subject.name} IB revision`,
    ],
    papers,
  }
}

export function buildIbPastPaperCopy(subject: IbSubject) {
  const short = ibShortName(subject)
  const range = ibYearRange()
  return {
    short,
    title: `IB ${short} ${subject.level} Past Papers & Mark Schemes`,
    description: `Every recent IB ${subject.name} ${subject.level} exam series (${range}) — ${subject.papers.join(', ')} — organised by session, with mark-scheme and markband guidance. Free on MarkScheme.`,
    path: `/ib/past-papers/${subject.slug}`,
    keywords: [
      `IB ${short} past papers`,
      `IB ${subject.name} ${subject.level} past papers`,
      `IB ${subject.name} mark scheme`,
      `IB ${subject.name} ${subject.level} markscheme`,
      `IB ${short} ${subject.level} exam questions`,
    ],
  }
}
