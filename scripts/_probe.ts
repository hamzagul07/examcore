import { buildVaultDiagramTheatres } from '@/lib/max/vault-diagram-showcase'
const t = buildVaultDiagramTheatres([{ code: 'ib-computer-science-hl', name: 'Computer Science HL' }])
console.log('theatres:', t.length)
for (const x of t) {
  console.log(' subject:', x.subjectCode, '| label:', x.subjectLabel, '| catalogCount:', x.catalogCount)
  console.log(' signature:', x.signature?.title ?? '(none)')
}
