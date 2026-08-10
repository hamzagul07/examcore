/**
 * Smoke-test storage-backed derived scheme cache (works without the SQL table).
 * Run: npx tsx scripts/verify-derived-scheme-storage.ts
 */
import { readFileSync } from 'fs'
import { writeDerivedScheme, lookupDerivedScheme } from '../lib/marking/derived-scheme-cache'
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
  const questionText =
    'Prepare the realisation account for Omira and Peter partnership dissolution storage cache probe.'
  const fp = schemeFingerprint({
    questionText,
    totalMarks: 18,
    subjectCode: '9706',
    board: 'Cambridge International',
  })

  const scheme: DerivedMarkScheme = {
    type: 'point_based',
    total_marks: 18,
    expected_answer: 'PC 180000',
    marks: Array.from({ length: 18 }, (_, i) => ({
      code: i % 2 ? 'A1' : 'M1',
      marks: 1,
      description: `point ${i + 1} — purchase consideration 180000`,
    })),
  }

  await writeDerivedScheme({
    fingerprint: fp,
    scheme,
    totalMarks: 18,
    subjectCode: '9706',
  })

  const hit = await lookupDerivedScheme(fp)
  if (
    !hit ||
    hit.source !== 'cache' ||
    hit.scheme.marks[0].description !== scheme.marks[0].description
  ) {
    throw new Error(`storage cache round-trip failed: ${JSON.stringify(hit)}`)
  }

  await writeDerivedScheme({
    fingerprint: fp,
    scheme: {
      ...scheme,
      marks: scheme.marks.map((m, i) =>
        i === 0 ? { ...m, description: 'SHOULD NOT OVERWRITE' } : m
      ),
    },
    totalMarks: 18,
    subjectCode: '9706',
  })
  const hit2 = await lookupDerivedScheme(fp)
  if (hit2?.scheme.marks[0].description !== scheme.marks[0].description) {
    throw new Error('insert-only violated — scheme was overwritten')
  }

  console.log('storage fallback cache: OK', {
    fingerprint: fp.slice(0, 16) + '…',
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
