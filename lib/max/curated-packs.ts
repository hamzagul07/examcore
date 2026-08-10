/**
 * Flagship Max curated packs — human-assembled JSON under content/max-packs/.
 * Digests are original summaries; paper paths deep-link into MarkScheme pages.
 */

export type CuratedPackLink = {
  label: string
  href: string
  note?: string
}

export type CuratedMaxPack = {
  subjectCode: string
  title: string
  blurb: string
  examinerDigest: string[]
  paperPath: CuratedPackLink[]
  courseLinks: CuratedPackLink[]
  techniqueLinks: CuratedPackLink[]
}

import pack9700 from '@/content/max-packs/9700.json'
import pack9702 from '@/content/max-packs/9702.json'
import pack9706 from '@/content/max-packs/9706.json'
import pack9708 from '@/content/max-packs/9708.json'
import pack9709 from '@/content/max-packs/9709.json'
import pack9618 from '@/content/max-packs/9618.json'

const PACKS: Record<string, CuratedMaxPack> = {
  '9709': pack9709 as CuratedMaxPack,
  '9702': pack9702 as CuratedMaxPack,
  '9700': pack9700 as CuratedMaxPack,
  '9706': pack9706 as CuratedMaxPack,
  '9708': pack9708 as CuratedMaxPack,
  '9618': pack9618 as CuratedMaxPack,
}

export function getCuratedMaxPack(subjectCode: string | null | undefined): CuratedMaxPack | null {
  if (!subjectCode) return null
  const code = subjectCode.trim()
  return PACKS[code] ?? null
}

export function listCuratedMaxPackCodes(): string[] {
  return Object.keys(PACKS)
}
