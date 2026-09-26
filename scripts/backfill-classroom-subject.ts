/**
 * Fills classrooms.subject_code for classes created before it existed.
 *
 *   npx tsx scripts/backfill-classroom-subject.ts            # dry run: report only
 *   npx tsx scripts/backfill-classroom-subject.ts --apply    # write the codes
 *
 * Run after supabase/migrations/20260926a_teacher_v2_classrooms.sql. The
 * board/level/subject → syllabus-code mapping lives in TypeScript
 * (lib/teacher/subject.ts, resolveClassroomSubjectCode), which is why this is
 * a script and not part of the migration: a second copy of the mapping in SQL
 * would drift from the one the product uses.
 *
 * Only unambiguous rows are written. Everything the resolver returns null for
 * — an O-Level Mathematics class (no syllabus tree yet), an IB "Chemistry"
 * that could be HL or SL, a non-Cambridge board — is listed and left null,
 * and the class settings page asks that teacher to choose. A wrong code would
 * be worse than none: every v2 analytics read is scoped by it.
 *
 * Safe to re-run: it only reads rows whose subject_code is still null, and
 * each write is guarded by `subject_code is null`, so a code a teacher has
 * picked in the meantime is never overwritten.
 */
// Local runs read .env.local; a shell that already exports the variables (CI,
// a production console) has no such file, and that is not an error.
try {
  process.loadEnvFile?.('.env.local')
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
}

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Row = { id: string; board: string | null; level: string | null; subject: string | null }

/** Keyset page size for the read. */
const PAGE_SIZE = 500
/** Ids per UPDATE ... WHERE id IN (...), kept well under PostgREST's URL limits. */
const WRITE_CHUNK = 100

type Service = ReturnType<(typeof import('../lib/supabase/service'))['createServiceClient']>

async function main() {
  const args = process.argv.slice(2)
  const unknown = args.filter((a) => a !== '--apply')
  if (unknown.length) {
    console.error(`Unknown argument(s): ${unknown.join(' ')}`)
    console.error('Usage: npx tsx scripts/backfill-classroom-subject.ts [--apply]')
    process.exit(1)
  }
  const apply = args.includes('--apply')

  const { createServiceClient } = await import('../lib/supabase/service')
  const { resolveClassroomSubjectCode } = await import('../lib/teacher/subject')
  const service = createServiceClient()

  const rows = await readUnsetClassrooms(service)
  const byCode = new Map<string, string[]>()
  const unresolved: Row[] = []
  for (const r of rows) {
    const code = resolveClassroomSubjectCode(r.board ?? '', r.level ?? '', r.subject ?? '')
    if (!code) {
      unresolved.push(r)
      continue
    }
    const ids = byCode.get(code) ?? []
    ids.push(r.id)
    byCode.set(code, ids)
  }

  const resolvable = rows.length - unresolved.length
  console.log(`${rows.length} classroom(s) without a subject_code; ${resolvable} resolvable.\n`)
  for (const [code, ids] of [...byCode].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${code.padEnd(28)} ${ids.length}`)
  }

  if (unresolved.length) {
    console.log(`\n${unresolved.length} left null (the teacher is asked in class settings):`)
    for (const r of unresolved) {
      console.log(`  ${r.id}  ${r.board ?? '—'} / ${r.level ?? '—'} / ${r.subject ?? '—'}`)
    }
  }

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to set the codes above.')
    return
  }

  let written = 0
  for (const [code, ids] of byCode) {
    for (let i = 0; i < ids.length; i += WRITE_CHUNK) {
      const chunk = ids.slice(i, i + WRITE_CHUNK)
      const { data, error } = await service
        .from('classrooms')
        .update({ subject_code: code })
        .in('id', chunk)
        .is('subject_code', null)
        .select('id')
      if (error) throw new Error(`update ${code}: ${error.message}`)
      written += data?.length ?? 0
    }
  }

  const skipped = resolvable - written
  console.log(
    `\nWrote subject_code on ${written} classroom(s).` +
      (skipped > 0 ? ` ${skipped} were set by their teacher in the meantime and left alone.` : '')
  )
}

/**
 * Every classroom with a null subject_code, keyset-paged by id. Keyset rather
 * than offset: a teacher choosing a subject while this reads makes a row drop
 * out of the filter, and offset paging over a shrinking set skips rows.
 */
async function readUnsetClassrooms(service: Service): Promise<Row[]> {
  const rows: Row[] = []
  let after: string | null = null
  for (;;) {
    let query = service
      .from('classrooms')
      .select('id, board, level, subject')
      .is('subject_code', null)
      .order('id', { ascending: true })
      .limit(PAGE_SIZE)
    if (after) query = query.gt('id', after)

    const { data, error } = await query
    if (error) {
      const hint = /subject_code/.test(error.message)
        ? ' (apply supabase/migrations/20260926a_teacher_v2_classrooms.sql first)'
        : ''
      throw new Error(`classrooms: ${error.message}${hint}`)
    }
    const page = (data ?? []) as Row[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    after = page[page.length - 1].id
  }
  return rows
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
