import { getIbSubject } from '@/lib/ib/catalog'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'

export type IbCatalogCard = MarginNotesSubject & {
  href: string
  boardLabel: string
  accentHex: string
}

/** Client-safe track grouping for IB catalog cards (no filesystem). */
export function ibCatalogCardsByTrack(cards: IbCatalogCard[]): {
  core: IbCatalogCard[]
  arts: IbCatalogCard[]
  stem: IbCatalogCard[]
} {
  const core: IbCatalogCard[] = []
  const arts: IbCatalogCard[] = []
  const stem: IbCatalogCard[] = []
  for (const c of cards) {
    const g = getIbSubject(c.code)?.groupNumber
    if (g === 7) core.push(c)
    else if (g === 6) arts.push(c)
    else stem.push(c)
  }
  return { core, arts, stem }
}
