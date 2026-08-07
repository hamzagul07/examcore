/**
 * Turns a Get Information About Schools (GIAS) extract into outreach targets.
 *
 * GIAS is the Department for Education's register of educational
 * establishments, published daily as CSV under the Open Government Licence —
 * that is, explicitly for reuse, with attribution. It is the reason this list
 * can be built at all: the IB World Schools directory returns 403 to automated
 * requests and IB's own rules prohibit reproducing their material for
 * commercial activity, so it is not a source we can take.
 *
 * What GIAS gives: real school names, websites, phone numbers, head teacher
 * names, and enough structure to keep only schools that teach to 18.
 *
 * What it does NOT give: **email addresses**. There is no email column, and
 * nothing here invents one. A plausible-looking guess (`head@school.sch.uk`)
 * bounces, and bounces are what destroy a sending domain — which cannot be
 * recovered inside a four-week window. Addresses are filled in per school from
 * the school's own staff page, which is also where a subject department head is
 * actually named.
 */

/** One establishment, after the columns we care about are pulled out. */
export type GiasRow = Record<string, string>

export type GiasSchool = {
  urn: string
  name: string
  website: string | null
  phone: string | null
  headName: string | null
  town: string | null
  postcode: string | null
  phase: string | null
  type: string | null
  highAge: number | null
}

export type GiasIngestResult = {
  schools: GiasSchool[]
  /** Every reason a row was dropped, counted. Never silent. */
  rejected: Record<string, number>
  totalRows: number
}

/**
 * GIAS headers are inconsistent: several arrive with a parenthesised suffix
 * (`EstablishmentStatus (name)`), casing varies between extracts, and councils
 * republishing the file sometimes re-spell them. Comparing on a folded key means
 * the ingester survives all of that instead of silently matching nothing.
 */
export function foldHeader(header: string): string {
  return header
    .replace(/\(.*?\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Candidate spellings for each field, in preference order. */
const FIELDS = {
  urn: ['urn'],
  name: ['establishmentname', 'schoolname', 'name'],
  status: ['establishmentstatus'],
  phase: ['phaseofeducation', 'phase'],
  type: ['typeofestablishment', 'establishmenttypegroup'],
  highAge: ['statutoryhighage', 'highage'],
  website: ['schoolwebsite', 'website'],
  phone: ['telephonenum', 'telephone', 'phone'],
  headFirst: ['headfirstname'],
  headLast: ['headlastname'],
  headTitle: ['headtitle'],
  town: ['town'],
  postcode: ['postcode'],
} as const

type FieldName = keyof typeof FIELDS

/** Maps folded header → the column name actually present in this file. */
export function mapColumns(headers: string[]): Partial<Record<FieldName, string>> {
  const byFold = new Map<string, string>()
  for (const h of headers) {
    const key = foldHeader(h)
    // First spelling wins, so a later near-duplicate column cannot displace it.
    if (key && !byFold.has(key)) byFold.set(key, h)
  }

  const mapped: Partial<Record<FieldName, string>> = {}
  for (const [field, candidates] of Object.entries(FIELDS) as [
    FieldName,
    readonly string[],
  ][]) {
    for (const candidate of candidates) {
      const hit = byFold.get(candidate)
      if (hit) {
        mapped[field] = hit
        break
      }
    }
  }
  return mapped
}

/** Columns without which the extract is not usable at all. */
export const REQUIRED_FIELDS: FieldName[] = ['urn', 'name']

/**
 * A school worth writing to teaches somebody sitting A-levels or the IB
 * Diploma. `StatutoryHighAge` is the honest filter: 18 means there is a sixth
 * form. Phase is used only as a fallback, since it is blank on some independent
 * schools.
 */
const SIXTH_FORM_PHASES = new Set([
  'secondary',
  '16 plus',
  'all-through',
  'all through',
  'middle deemed secondary',
])

function cleanWebsite(raw: string | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  // GIAS records these inconsistently: bare hosts, http, trailing spaces.
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    return url.host.includes('.') ? url.toString() : null
  } catch {
    return null
  }
}

function headName(row: GiasRow, cols: Partial<Record<FieldName, string>>): string | null {
  const first = (cols.headFirst ? row[cols.headFirst] : '')?.trim() ?? ''
  const last = (cols.headLast ? row[cols.headLast] : '')?.trim() ?? ''
  const title = (cols.headTitle ? row[cols.headTitle] : '')?.trim() ?? ''
  const name = [title, first, last].filter(Boolean).join(' ').trim()
  return name || null
}

export function ingestGias(
  rows: GiasRow[],
  headers: string[],
  opts: { minHighAge?: number } = {}
): GiasIngestResult {
  const minHighAge = opts.minHighAge ?? 18
  const cols = mapColumns(headers)

  const missing = REQUIRED_FIELDS.filter((f) => !cols[f])
  if (missing.length) {
    throw new Error(
      `This does not look like a GIAS extract — missing ${missing.join(', ')}. ` +
        `Found columns: ${headers.slice(0, 12).join(', ')}${headers.length > 12 ? ', …' : ''}`
    )
  }

  const rejected: Record<string, number> = {}
  const reject = (reason: string) => {
    rejected[reason] = (rejected[reason] ?? 0) + 1
  }

  const schools: GiasSchool[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const name = (row[cols.name!] ?? '').trim()
    const urn = (row[cols.urn!] ?? '').trim()
    if (!name || !urn) {
      reject('no name or URN')
      continue
    }

    // A closed school is not a target, and writing to one is the sort of thing
    // that gets an outreach campaign remembered for the wrong reason.
    const status = (cols.status ? row[cols.status] : '')?.trim().toLowerCase() ?? ''
    if (status && status !== 'open' && !status.startsWith('open')) {
      reject(`not open (${status})`)
      continue
    }

    // Blank must mean "not recorded", not zero: `Number('')` is 0, which is
    // finite, and read as an age it rejected every school with an empty cell as
    // teaching to age 0 — silently dropping exactly the independent schools the
    // phase fallback exists to catch.
    const highAgeRaw = (cols.highAge ? row[cols.highAge] : '')?.trim() ?? ''
    const highAgeNum = highAgeRaw ? Number(highAgeRaw) : NaN
    const highAge = Number.isFinite(highAgeNum) ? highAgeNum : null
    const phase = (cols.phase ? row[cols.phase] : '')?.trim() ?? ''

    if (highAge !== null) {
      if (highAge < minHighAge) {
        reject(`no sixth form (teaches to ${highAge})`)
        continue
      }
    } else if (!SIXTH_FORM_PHASES.has(phase.toLowerCase())) {
      // No age recorded and the phase is not one that reaches 18.
      reject(phase ? `phase ${phase}` : 'no age or phase recorded')
      continue
    }

    if (seen.has(urn)) {
      reject('duplicate URN')
      continue
    }
    seen.add(urn)

    schools.push({
      urn,
      name,
      website: cleanWebsite(cols.website ? row[cols.website] : undefined),
      phone: (cols.phone ? row[cols.phone] : '')?.trim() || null,
      headName: headName(row, cols),
      town: (cols.town ? row[cols.town] : '')?.trim() || null,
      postcode: (cols.postcode ? row[cols.postcode] : '')?.trim() || null,
      phase: phase || null,
      type: (cols.type ? row[cols.type] : '')?.trim() || null,
      highAge,
    })
  }

  return { schools, rejected, totalRows: rows.length }
}

/**
 * Ranks schools for a limited first send.
 *
 * Two hundred personalised emails is the realistic ceiling for one person in the
 * return-to-school window, so which two hundred matters. A school with a website
 * can have its department contact found in a couple of minutes; one without
 * cannot be researched at all, and goes last.
 */
export function prioritise(schools: GiasSchool[]): GiasSchool[] {
  const score = (s: GiasSchool) =>
    (s.website ? 4 : 0) + (s.headName ? 2 : 0) + (s.phone ? 1 : 0)
  return [...schools].sort(
    (a, b) => score(b) - score(a) || a.name.localeCompare(b.name)
  )
}
