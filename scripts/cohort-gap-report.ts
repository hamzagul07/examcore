/**
 * Prints the cohort gap report for a classroom, or for the whole corpus.
 *
 *   pnpm cohort:gaps                 # every marked attempt (sanity check)
 *   pnpm cohort:gaps <classroom-id>  # one class
 *
 * Exists so the report can be checked against real marking before it is put in
 * front of a teacher, and so a gap report can be produced for an outreach
 * conversation without anyone signing in.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { buildCohortGapReport, headlineGap } = await import('../lib/teacher/cohort-gaps')
  const service = createServiceClient()

  const classroomId = process.argv[2]

  let studentIds: string[] | null = null
  if (classroomId) {
    const { data, error } = await service
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId)
    if (error) throw new Error(error.message)
    studentIds = (data ?? []).map((m) => m.student_id as string)
    if (!studentIds.length) {
      console.log('That classroom has no students enrolled.')
      return
    }
  }

  let q = service
    .from('attempts')
    .select('user_id, marks_earned, total_marks, ai_marking')
    .not('ai_marking', 'is', null)
    .limit(2000)
  if (studentIds) q = q.in('user_id', studentIds)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const report = buildCohortGapReport(
    (data ?? []) as Parameters<typeof buildCohortGapReport>[0]
  )

  console.log(
    classroomId ? `Cohort gap report — classroom ${classroomId}` : 'Cohort gap report — all marked work'
  )
  console.log(
    `${report.scripts} scripts from ${report.students} students · class average ${report.averagePct}% (${report.marksEarned}/${report.marksAvailable})`
  )

  if (report.insufficientEvidence) {
    console.log('\nToo little marked work to report on yet (needs 3+ marked scripts).')
    return
  }

  if (report.bandedScriptsExcluded) {
    console.log(
      `\n${report.bandedScriptsExcluded} level-of-response script(s) counted in the average but ` +
        `excluded from the mark-type table (band descriptors are not per-mark points).`
    )
  }

  const headline = headlineGap(report)
  console.log(
    headline
      ? `\nHEADLINE: the class earns only ${headline.earnedPct}% of ${headline.label} marks (${headline.earned}/${headline.points}).`
      : '\nHEADLINE: no single mark type stands out as a weakness.'
  )

  console.log('\nBY MARK TYPE (weakest first)')
  console.log('TYPE                        EARNED   POINTS    %')
  for (const t of report.markTypes) {
    console.log(
      t.label.slice(0, 26).padEnd(28) +
        String(t.earned).padStart(6) +
        String(t.points).padStart(9) +
        `${t.earnedPct}%`.padStart(5) +
        (t.thinEvidence ? '  (thin)' : '')
    )
  }

  if (report.mostMissed.length) {
    console.log('\nMOST-MISSED POINTS (students affected)')
    for (const m of report.mostMissed) {
      console.log(`  ${String(m.students).padStart(3)}  ${m.note.slice(0, 90)}`)
    }
  }

  if (report.errorBreakdown.length) {
    console.log('\nWHY MARKS WERE DROPPED')
    for (const e of report.errorBreakdown) {
      console.log(`  ${String(e.count).padStart(4)}  ${e.label}`)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
