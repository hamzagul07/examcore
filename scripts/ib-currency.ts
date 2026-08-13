/**
 * Is every catalogued IB rubric still the one students are assessed against?
 *
 *   pnpm ib:currency            # audit the catalogue
 *   pnpm ib:currency --year 2027  # look ahead to a future session
 *
 * Exists because nothing could answer that question. The catalogue recorded
 * when a guide started and never when it stopped, so a withdrawn rubric was
 * indistinguishable from a current one — and one was ingested and marked
 * students live before anybody noticed. This is the check that makes the
 * failure loud instead of silent.
 *
 * Exits non-zero when anything is expired, so it can gate a release rather than
 * only inform a human who remembered to look.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type SubjectRow = {
  code: string
  name: string
  first_assessment_year: number | null
  last_assessment_year: number | null
}

/**
 * The session a mark is being judged against. IB exam years run May/November,
 * so the current calendar year is the right comparison: a guide last assessed
 * in 2026 is spent once 2026's sessions are done, and students studying now sit
 * its replacement.
 */
function currentSession(): number {
  return Number(process.argv[process.argv.indexOf('--year') + 1]) ||
    new Date().getFullYear()
}

function statusOf(row: SubjectRow, session: number) {
  if (row.last_assessment_year == null) return 'unknown-end' as const
  if (row.last_assessment_year < session) return 'expired' as const
  if (row.last_assessment_year === session) return 'final-session' as const
  return 'current' as const
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const service = createServiceClient()
  const session = currentSession()

  const { data, error } = await service
    .from('ib_subject')
    .select('code, name, first_assessment_year, last_assessment_year')
    .order('code')
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as SubjectRow[]
  if (!rows.length) {
    console.log('No catalogued IB subjects.')
    return
  }

  // How much rubric actually rides on each subject, so a stale entry can be
  // weighed by what it affects rather than treated as one line among many.
  const { data: comps } = await service
    .from('ib_component')
    .select('subject_code')
  const componentCount = new Map<string, number>()
  for (const c of (comps ?? []) as { subject_code: string }[]) {
    componentCount.set(c.subject_code, (componentCount.get(c.subject_code) ?? 0) + 1)
  }

  const buckets: Record<string, SubjectRow[]> = {
    expired: [],
    'final-session': [],
    current: [],
    'unknown-end': [],
  }
  for (const r of rows) buckets[statusOf(r, session)].push(r)

  console.log(`\nIB CATALOGUE CURRENCY — assessed against the ${session} session\n`)

  const show = (title: string, list: SubjectRow[], note?: string) => {
    if (!list.length) return
    console.log(`${title} (${list.length})`)
    if (note) console.log(`  ${note}`)
    for (const r of list) {
      const span = `${r.first_assessment_year ?? '?'}–${r.last_assessment_year ?? 'open'}`
      console.log(
        `  ${r.code.padEnd(26)} ${span.padEnd(12)} ${componentCount.get(r.code) ?? 0} component(s)  ${r.name}`
      )
    }
    console.log('')
  }

  show(
    'WITHDRAWN — marking against a rubric students are no longer assessed on',
    buckets.expired
  )
  show(
    'FINAL SESSION — replaced for anyone studying now',
    buckets['final-session'],
    'Students sitting this session still need it; students starting do not.'
  )
  show('CURRENT', buckets.current)
  show(
    'NO PUBLISHED END DATE',
    buckets['unknown-end'],
    'Not the same as verified current — nobody has found an end date, which is also what an unchecked subject looks like.'
  )

  const stale = buckets.expired.length + buckets['final-session'].length
  if (stale > 0) {
    console.log(
      `${stale} subject(s) need a newer guide ingested. Extract with ` +
        'scripts/extract-ib-criteria.mjs, then apply with scripts/apply-ib-criteria.mjs.\n'
    )
  }
  if (buckets.expired.length > 0) process.exitCode = 1
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
