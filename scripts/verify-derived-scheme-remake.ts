/**
 * Manual check: Ayush Omira/Peter stem @ total 18 resolves fresh then cache,
 * with an identical rubric on the remake (no second derive).
 *
 * Run: npx tsx scripts/verify-derived-scheme-remake.ts
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { resolveDerivedSchemeForMark } from '../lib/marking/resolve-derived-scheme'
import { schemeFingerprint } from '../lib/marking/scheme-fingerprint'
import type { DerivedMarkScheme } from '../lib/marking/derive-scheme'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (process.env[k] === undefined) process.env[k] = v
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: attempt, error } = await sb
    .from('attempts')
    .select('question_text')
    .eq('id', '007d39a9-1478-437e-9175-25e9a284dc89')
    .single()
  if (error || !attempt?.question_text) {
    throw new Error(`Could not load Omira attempt: ${error?.message}`)
  }

  const questionText = attempt.question_text as string
  const fp = schemeFingerprint({
    questionText,
    totalMarks: 18,
    subjectCode: '9706',
    board: 'Cambridge International',
  })

  const rubric: DerivedMarkScheme = {
    type: 'point_based',
    total_marks: 18,
    expected_answer: 'PC 180000; settlements Omira 45780 Peter 29720',
    marks: [
      {
        code: 'B1',
        marks: 1,
        description: 'Purchase consideration is 180000 not 200000',
      },
      ...Array.from({ length: 17 }, (_, i) => ({
        code: i % 3 === 0 ? 'A1' : 'M1',
        marks: 1,
        description: `Accounting point ${i + 2}`,
      })),
    ],
  }

  let deriveCalls = 0
  const memory = new Map<
    string,
    { scheme: DerivedMarkScheme; total_marks: number }
  >()
  const deps = {
    lookup: async (fingerprint: string) => {
      const hit = memory.get(fingerprint)
      return hit
        ? {
            fingerprint,
            scheme: hit.scheme,
            total_marks: hit.total_marks,
            source: 'cache' as const,
          }
        : null
    },
    write: async (params: {
      fingerprint: string
      scheme: DerivedMarkScheme
      totalMarks: number
    }) => {
      memory.set(params.fingerprint, {
        scheme: params.scheme,
        total_marks: params.totalMarks,
      })
    },
    derive: async () => {
      deriveCalls += 1
      return { scheme: rubric, total: 18 }
    },
  }

  const params = {
    questionText,
    totalMarks: 18,
    subjectName: 'Accounting',
    board: 'Cambridge International',
    subjectCode: '9706',
    mathConventions: false,
  }

  const first = await resolveDerivedSchemeForMark(params, deps)
  const second = await resolveDerivedSchemeForMark(params, deps)

  if (
    first?.source !== 'fresh' ||
    second?.source !== 'cache' ||
    deriveCalls !== 1 ||
    first.fingerprint !== fp ||
    second.fingerprint !== fp ||
    first.scheme.marks[0].description !== second.scheme.marks[0].description
  ) {
    throw new Error(
      `Omira/Peter remake check failed: ${JSON.stringify({
        first: first?.source,
        second: second?.source,
        deriveCalls,
        fpMatch: first?.fingerprint === fp,
      })}`
    )
  }

  // Best-effort: if the migration is live, round-trip through the real table.
  const { error: tableErr } = await sb
    .from('derived_mark_schemes')
    .select('fingerprint')
    .limit(1)
  if (!tableErr) {
    const { writeDerivedScheme, lookupDerivedScheme } = await import(
      '../lib/marking/derived-scheme-cache'
    )
    await writeDerivedScheme({
      fingerprint: fp,
      scheme: rubric,
      totalMarks: 18,
      subjectCode: '9706',
    })
    const hit = await lookupDerivedScheme(fp)
    if (!hit || hit.source !== 'cache') {
      throw new Error('Live table write/lookup failed')
    }
    console.log('live derived_mark_schemes round-trip: OK')
  } else {
    console.log(
      'SQL table not applied yet — storage fallback covers remakes. Optional: apply supabase/migrations/20260810_derived_mark_schemes.sql'
    )
  }

  console.log('manual-verify Omira/Peter @18: OK', {
    fingerprint: fp.slice(0, 16) + '…',
    firstPoint: first.scheme.marks[0].description,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
