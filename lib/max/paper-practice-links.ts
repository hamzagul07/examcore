/**
 * Where Vault / Max packs send students for timed papers.
 * Cambridge → our past-paper hubs. IB → licensed official/community sources
 * (we do not host IB papers) plus our /ib/past-papers practice desk.
 */
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import {
  IB_GLOBAL_RESOURCES,
  getIbSubjectResources,
  type IbResource,
} from '@/lib/ib/resources'

export type PaperPracticeLink = {
  label: string
  href: string
  note: string
  /** External licensed source vs our MarkScheme desk. */
  external: boolean
}

function ibSlug(subjectCode: string): string {
  return subjectCode.replace(/^ib-/, '')
}

/** In-app past-paper / practice hub for a subject code. */
export function pastPaperHubHref(subjectCode: string): string {
  if (isIbSubjectCode(subjectCode)) {
    return `/ib/past-papers/${encodeURIComponent(ibSlug(subjectCode))}`
  }
  return `/past-papers/${encodeURIComponent(subjectCode)}`
}

/** In-app course hub for a subject code. */
export function courseHubHref(subjectCode: string): string {
  if (isIbSubjectCode(subjectCode)) {
    return `/ib/courses/${encodeURIComponent(ibSlug(subjectCode))}`
  }
  return `/courses/${encodeURIComponent(subjectCode)}`
}

/**
 * Licensed places to sit a real IB paper (official IBO first), then our
 * topic-practice desk. Cambridge keeps the MarkScheme past-papers hub.
 */
export function paperPracticeLinks(subjectCode: string): PaperPracticeLink[] {
  if (!isIbSubjectCode(subjectCode)) {
    return [
      {
        label: `${subjectCode} past papers`,
        href: pastPaperHubHref(subjectCode),
        note: 'Timed practice hubs on MarkScheme — then mark here.',
        external: false,
      },
    ]
  }

  const slug = ibSlug(subjectCode)
  const licensed: IbResource[] = [
    ...IB_GLOBAL_RESOURCES.slice(0, 2), // IBO official + RevisionDojo predicted
    ...getIbSubjectResources({ slug }).slice(0, 2),
  ]

  const seen = new Set<string>()
  const out: PaperPracticeLink[] = []
  for (const r of licensed) {
    if (seen.has(r.href)) continue
    seen.add(r.href)
    out.push({
      label: r.label,
      href: r.href,
      note: r.note,
      external: true,
    })
  }

  out.push({
    label: 'MarkScheme IB practice desk',
    href: pastPaperHubHref(subjectCode),
    note: 'Topic drills + mark against IB band descriptors on MarkScheme.',
    external: false,
  })

  return out
}

/**
 * Timed-paper slots for Max sprint/week packs.
 * IB: send students to official/licensed papers, then mark on MarkScheme.
 */
export function timedPaperSlots(subjectCode: string): Array<{
  label: string
  href: string
  minutes: number
}> {
  const links = paperPracticeLinks(subjectCode)
  if (isIbSubjectCode(subjectCode)) {
    const official = links.find((l) => l.href.includes('ibo.org')) ?? links[0]
    const predicted = links.find((l) => l.href.includes('revisiondojo')) ?? links[1] ?? official
    const desk = links.find((l) => !l.external) ?? links[links.length - 1]
    return [
      {
        label: 'IBO specimen / sample paper',
        href: official.href,
        minutes: 90,
      },
      {
        label: 'Licensed predicted paper',
        href: predicted.href,
        minutes: 90,
      },
      {
        label: 'MarkScheme IB practice desk',
        href: desk.href,
        minutes: 75,
      },
    ]
  }

  const hub = pastPaperHubHref(subjectCode)

  // Economics: MCQ / data response / essay — names match how students sit the suite.
  if (subjectCode === '9708') {
    return [
      {
        label: '9708 Paper 1 · Multiple choice',
        href: hub,
        minutes: 60,
      },
      {
        label: '9708 Paper 2 · Data response & essay',
        href: hub,
        minutes: 105,
      },
      {
        label: '9708 Paper 3 / 4 · A2 essay papers',
        href: hub,
        minutes: 105,
      },
    ]
  }

  if (subjectCode === '9706') {
    return [
      {
        label: '9706 Paper 1 · Multiple choice',
        href: hub,
        minutes: 60,
      },
      {
        label: '9706 Paper 2 · Structured questions',
        href: hub,
        minutes: 90,
      },
      {
        label: '9706 Paper 3 · Analysis & evaluation',
        href: hub,
        minutes: 105,
      },
    ]
  }

  return [
    { label: `${subjectCode} timed paper 1`, href: hub, minutes: 75 },
    { label: `${subjectCode} timed paper 2`, href: hub, minutes: 90 },
    { label: `${subjectCode} timed paper 3`, href: hub, minutes: 90 },
  ]
}
