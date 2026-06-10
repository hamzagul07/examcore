import assert from 'node:assert/strict'
import { headingSlug } from '../blog/heading-slug'
import { extractHeadings } from '../blog/meta'
import { parseFanOutChunks } from './fan-out'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const content = `## Biology topics ranked

| Rank | Topic |
| --- | --- |
| 1 | Cells |

Paragraph after table.

## Sources

Footer sources here.
`

const slug = 'cambridge-0610-biology-guide'
const chunks = parseFanOutChunks(content, slug)
const headings = extractHeadings(content)

check('table stays out of chunk lead', !chunks[0]?.lead.includes('| Rank |'))
check('table remains in body markdown', Boolean(chunks[0]?.bodyMarkdown.includes('| Rank |')))
check('sources chunk skipped', !chunks.some((c) => c.heading.toLowerCase() === 'sources'))
check('sources omitted from TOC', !headings.some((h) => h.text.toLowerCase() === 'sources'))

const biologyChunk = chunks.find((c) => c.heading === 'Biology topics ranked')
const biologyHeading = headings.find((h) => h.text === 'Biology topics ranked')
check(
  'TOC id matches chunk id',
  Boolean(biologyChunk && biologyHeading && biologyChunk.id === biologyHeading.id)
)
assert.equal(headingSlug('A'.repeat(100)).length, 72)

if (failed > 0) {
  console.error(`\n${failed} fan-out test(s) failed`)
  process.exit(1)
}

console.log('fan-out tests passed')
