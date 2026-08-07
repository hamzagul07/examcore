import assert from 'node:assert/strict'
import {
  foldHeader,
  ingestGias,
  mapColumns,
  prioritise,
  type GiasRow,
} from '@/lib/outreach/gias'

// --- header folding ------------------------------------------------------------

// GIAS ships several columns with a parenthesised suffix, and councils
// republishing the extract re-spell them. Comparison happens on a folded key so
// the ingester survives that rather than silently matching nothing.
assert.equal(foldHeader('EstablishmentStatus (name)'), 'establishmentstatus')
assert.equal(foldHeader('EstablishmentName'), 'establishmentname')
assert.equal(foldHeader('  Statutory High Age  '), 'statutoryhighage')
assert.equal(foldHeader('SCHOOL_WEBSITE'), 'schoolwebsite')

const cols = mapColumns([
  'URN',
  'EstablishmentName',
  'EstablishmentStatus (name)',
  'PhaseOfEducation (name)',
  'StatutoryHighAge',
  'SchoolWebsite',
  'TelephoneNum',
  'HeadTitle (name)',
  'HeadFirstName',
  'HeadLastName',
  'Town',
  'Postcode',
])
assert.equal(cols.name, 'EstablishmentName')
assert.equal(cols.status, 'EstablishmentStatus (name)')
assert.equal(cols.highAge, 'StatutoryHighAge')
assert.equal(cols.website, 'SchoolWebsite')

// --- an unrecognised file fails loudly ------------------------------------------

assert.throws(
  () => ingestGias([{ a: '1' }], ['a', 'b']),
  /does not look like a GIAS extract/,
  'a wrong file must not import zero rows and call it success'
)

// --- filtering -------------------------------------------------------------------

const HEADERS = [
  'URN',
  'EstablishmentName',
  'EstablishmentStatus (name)',
  'PhaseOfEducation (name)',
  'StatutoryHighAge',
  'SchoolWebsite',
  'TelephoneNum',
  'HeadFirstName',
  'HeadLastName',
]

const row = (over: Partial<GiasRow> = {}): GiasRow => ({
  URN: '100001',
  EstablishmentName: 'Example School',
  'EstablishmentStatus (name)': 'Open',
  'PhaseOfEducation (name)': 'Secondary',
  StatutoryHighAge: '18',
  SchoolWebsite: 'https://example.sch.uk',
  TelephoneNum: '01234 567890',
  HeadFirstName: 'Ada',
  HeadLastName: 'Lovelace',
  ...over,
})

const result = ingestGias(
  [
    row(),
    row({ URN: '100002', EstablishmentName: 'Primary Only', StatutoryHighAge: '11' }),
    row({ URN: '100003', EstablishmentName: 'Closed School', 'EstablishmentStatus (name)': 'Closed' }),
    row({ URN: '100004', EstablishmentName: 'Sixth Form', StatutoryHighAge: '19' }),
    row({ URN: '100001', EstablishmentName: 'Example School (again)' }),
    row({ URN: '', EstablishmentName: 'No URN' }),
  ],
  HEADERS
)

assert.equal(result.totalRows, 6)
assert.deepEqual(
  result.schools.map((s) => s.urn),
  ['100001', '100004'],
  'only open schools that teach to 18'
)

// Every drop is accounted for by reason — a filter that quietly discards most of
// a 25,000-row file is indistinguishable from a broken one.
assert.equal(result.rejected['no sixth form (teaches to 11)'], 1)
assert.equal(result.rejected['not open (closed)'], 1)
assert.equal(result.rejected['duplicate URN'], 1)
assert.equal(result.rejected['no name or URN'], 1)
assert.equal(
  Object.values(result.rejected).reduce((a, b) => a + b, 0) + result.schools.length,
  result.totalRows,
  'every row is either kept or counted as rejected'
)

// --- field extraction ---------------------------------------------------------------

const school = result.schools[0]
assert.equal(school.name, 'Example School')
assert.equal(school.headName, 'Ada Lovelace')
assert.equal(school.phone, '01234 567890')
assert.equal(school.website, 'https://example.sch.uk/')
assert.equal(school.highAge, 18)

// Websites are recorded inconsistently in GIAS: bare hosts, http, stray spaces.
const websites = ingestGias(
  [
    row({ URN: '1', SchoolWebsite: 'www.a.sch.uk' }),
    row({ URN: '2', SchoolWebsite: '  http://b.sch.uk/index.html ' }),
    row({ URN: '3', SchoolWebsite: 'not a website' }),
    row({ URN: '4', SchoolWebsite: '' }),
  ],
  HEADERS
).schools

assert.equal(websites[0].website, 'https://www.a.sch.uk/', 'a bare host gets a scheme')
assert.equal(websites[1].website, 'http://b.sch.uk/index.html')
assert.equal(websites[2].website, null, 'junk is dropped rather than half-repaired')
assert.equal(websites[3].website, null)

// A missing head is null, never a fabricated name.
assert.equal(
  ingestGias([row({ HeadFirstName: '', HeadLastName: '' })], HEADERS).schools[0].headName,
  null
)

// --- phase fallback when no age is recorded --------------------------------------

const noAge = ingestGias(
  [
    row({ URN: '1', StatutoryHighAge: '', 'PhaseOfEducation (name)': 'Secondary' }),
    row({ URN: '2', StatutoryHighAge: '', 'PhaseOfEducation (name)': 'Primary' }),
    row({ URN: '3', StatutoryHighAge: '', 'PhaseOfEducation (name)': '' }),
  ],
  HEADERS
)
assert.deepEqual(noAge.schools.map((s) => s.urn), ['1'], 'phase covers a blank age')
assert.equal(noAge.rejected['phase Primary'], 1)
assert.equal(noAge.rejected['no age or phase recorded'], 1)

// --- prioritisation ----------------------------------------------------------------

// 200 personalised emails is one person's realistic ceiling in the September
// window, so a school whose department contact can actually be looked up ranks
// above one that cannot be researched at all.
const ranked = prioritise([
  { ...school, urn: 'a', name: 'No Website', website: null, headName: null, phone: null },
  { ...school, urn: 'b', name: 'Full Record' },
  { ...school, urn: 'c', name: 'Website Only', headName: null, phone: null },
])
assert.deepEqual(ranked.map((s) => s.urn), ['b', 'c', 'a'])

console.log('outreach/gias.test.ts — all assertions passed')
