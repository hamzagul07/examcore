/** Group IB cluster blog spokes for hub pages and internal linking. */

export type IbGuideGroup = {
  id: string
  label: string
  slugs: string[]
}

function sortSlugs(slugs: string[]): string[] {
  return [...slugs].sort((a, b) => a.localeCompare(b))
}

export function groupIbClusterSpokes(slugs: string[]): IbGuideGroup[] {
  const editorial = sortSlugs(
    slugs.filter((s) => !s.endsWith('-past-papers-guide') && !s.endsWith('-ia-guide'))
  )
  const pastHl = sortSlugs(slugs.filter((s) => s.endsWith('-hl-past-papers-guide')))
  const pastSl = sortSlugs(slugs.filter((s) => s.endsWith('-sl-past-papers-guide')))
  const pastOther = sortSlugs(
    slugs.filter(
      (s) =>
        s.endsWith('-past-papers-guide') &&
        !s.endsWith('-hl-past-papers-guide') &&
        !s.endsWith('-sl-past-papers-guide')
    )
  )
  const ia = sortSlugs(slugs.filter((s) => s.endsWith('-ia-guide')))

  const groups: IbGuideGroup[] = []
  if (editorial.length) {
    groups.push({ id: 'editorial', label: 'Diploma essentials', slugs: editorial })
  }
  if (pastHl.length) {
    groups.push({ id: 'past-hl', label: 'Higher Level subject guides', slugs: pastHl })
  }
  if (pastSl.length) {
    groups.push({ id: 'past-sl', label: 'Standard Level subject guides', slugs: pastSl })
  }
  if (pastOther.length) {
    groups.push({ id: 'past-core', label: 'Core & interdisciplinary', slugs: pastOther })
  }
  if (ia.length) {
    groups.push({ id: 'ia', label: 'Internal Assessment (IA)', slugs: ia })
  }
  return groups
}
