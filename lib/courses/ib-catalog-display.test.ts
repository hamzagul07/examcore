/**
 * Pins the two rules the /courses catalog cards depend on:
 *   - a card tab never prints a course slug ("english-a-lang-lit-hl"), and
 *   - HL and SL of one subject fold into a single card that keeps both hrefs,
 *     so nothing a student could reach before the merge is lost.
 *
 * Run with: pnpm exec tsx lib/courses/ib-catalog-display.test.ts
 */
import assert from 'node:assert/strict'
import {
  ibBaseSlug,
  ibCatalogGroups,
  ibDisplayCode,
  ibLevelFromSlug,
  type IbCatalogCard,
} from './ib-catalog-display'

function card(code: string, over: Partial<IbCatalogCard> = {}): IbCatalogCard {
  return {
    code,
    codeLabel: ibDisplayCode(code),
    name: 'Subject',
    glyph: 'S',
    acc: 'ink',
    level: ibLevelFromSlug(code) === 'HL' ? 'Higher Level' : 'Standard Level',
    fam: 'Sciences',
    units: 4,
    lessons: 10,
    q: 20,
    prog: 0,
    href: `/ib/courses/${code}`,
    boardLabel: 'IB Diploma',
    accentHex: '#000',
    ...over,
  }
}

// Display codes
assert.equal(ibDisplayCode('english-a-lang-lit-hl'), 'ENG A L&L · HL')
assert.equal(ibDisplayCode('business-management-sl'), 'BUS MGT · SL')
assert.equal(ibDisplayCode('tok'), 'TOK')
assert.equal(ibDisplayCode('extended-essay'), 'EE')
assert.equal(ibDisplayCode('biology-hl', false), 'BIO')
// Unknown slugs still never leak a slug: initials, or a clipped single word.
assert.equal(ibDisplayCode('brand-new-subject-hl'), 'BNS · HL')
assert.equal(ibDisplayCode('philosophy-sl'), 'PHILO · SL')
assert.ok(!ibDisplayCode('brand-new-subject-hl').includes('-'))

assert.equal(ibLevelFromSlug('maths-aa-sl'), 'SL')
assert.equal(ibLevelFromSlug('cas'), null)
assert.equal(ibBaseSlug('maths-aa-sl'), 'maths-aa')

// Grouping keeps first-seen order (pinned subjects stay first) and both hrefs.
const groups = ibCatalogGroups([
  card('physics-sl'),
  card('biology-hl'),
  card('biology-sl', { lessons: 7, isNew: true }),
  card('tok'),
  card('physics-hl'),
])
assert.deepEqual(
  groups.map((g) => g.code),
  ['physics-hl', 'biology-hl', 'tok']
)
const bio = groups[1]
assert.equal(bio.codeLabel, 'BIO')
assert.equal(bio.level, 'HL · SL')
assert.deepEqual(
  bio.levels.map((l) => [l.label, l.href, l.lessons]),
  [
    ['HL', '/ib/courses/biology-hl', 10],
    ['SL', '/ib/courses/biology-sl', 7],
  ]
)
// Only one level's batch is new, so the merged subject is not.
assert.equal(bio.isNew, false)
// Core subjects have no chooser and keep their own label.
assert.deepEqual(groups[2].levels, [])
assert.equal(groups[2].codeLabel, 'TOK')

// Every href that went in comes out somewhere a student can click.
const hrefsIn = ['physics-sl', 'biology-hl', 'biology-sl', 'tok', 'physics-hl'].map(
  (c) => `/ib/courses/${c}`
)
const hrefsOut = new Set(groups.flatMap((g) => [g.href, ...g.levels.map((l) => l.href)]))
for (const h of hrefsIn) assert.ok(hrefsOut.has(h), `missing ${h}`)

// A started level becomes the representative so the ring shows its progress.
const started = ibCatalogGroups([card('chemistry-hl'), card('chemistry-sl', { prog: 40 })])
assert.equal(started[0].href, '/ib/courses/chemistry-sl')
assert.equal(started[0].prog, 40)
assert.equal(started[0].levels[0].label, 'HL')

console.log('ib-catalog-display: ok')
