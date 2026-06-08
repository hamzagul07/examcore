#!/usr/bin/env node
/**
 * Prompt C Phase 5 — topic tagging against syllabus_objectives.
 *
 * Usage:
 *   pnpm tag:questions --session=s24
 *   pnpm tag:questions --session=s24 --paper=4
 *   pnpm tag:questions --session=s24 --persist
 *   pnpm tag:questions --session=s24 --no-audit
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function parseArgs(argv) {
  let session = null
  let paper = null
  let subject = '9702'
  let persist = false
  let audit = true
  let concurrency = 2
  let auditOnly = false

  for (const arg of argv) {
    if (arg.startsWith('--session=')) session = arg.slice('--session='.length)
    else if (arg.startsWith('--paper=')) paper = arg.slice('--paper='.length)
    else if (arg.startsWith('--subject=')) subject = arg.slice('--subject='.length)
    else if (arg.startsWith('--concurrency=')) concurrency = Number(arg.slice('--concurrency='.length))
    else if (arg === '--persist') persist = true
    else if (arg === '--no-audit') audit = false
    else if (arg === '--audit-only') auditOnly = true
  }

  return { session, paper, subject, persist, audit, concurrency, auditOnly }
}

async function main() {
  loadEnv()
  const { session, paper, subject, persist, audit, concurrency, auditOnly } = parseArgs(
    process.argv.slice(2)
  )

  if (!session) {
    console.error(
      'Usage: pnpm tag:questions --session=s24 [--paper=4] [--subject=9702] [--persist] [--no-audit]'
    )
    process.exit(1)
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required in .env.local')
    process.exit(1)
  }

  let supabase = null
  if (persist) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('--persist requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }

  const {
    runTopicTagging,
    runAuditOnly,
    TAG_ACCURACY_TARGET,
  } = await import('../lib/extraction/topic-tagger.ts')

  if (auditOnly) {
    if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
    console.log(`Re-auditing ${subject} session ${session} from saved tagging output...`)
    const { bulk, audit: auditResult, calibration, outPath } = await runAuditOnly({
      rootDir: ROOT,
      sessionCode: session,
      subjectCode: subject,
      supabase: supabase ?? undefined,
    })
    printResults(bulk, auditResult, calibration, outPath, TAG_ACCURACY_TARGET)
    return
  }

  console.log(
    `Tagging ${subject} session ${session}${paper ? ` paper ${paper}` : ''} (leaves only)...`
  )

  const { bulk, audit: auditResult, calibration, outPath } = await runTopicTagging({
    rootDir: ROOT,
    sessionCode: session,
    subjectCode: subject,
    paperNumber: paper ?? undefined,
    persist,
    audit,
    supabase: supabase ?? undefined,
    concurrency,
  })

  printResults(bulk, auditResult, calibration, outPath, TAG_ACCURACY_TARGET)
}

function printResults(bulk, auditResult, calibration, outPath, TAG_ACCURACY_TARGET) {
  console.log(`\nWrote ${outPath}`)
  console.log(`Questions processed: ${bulk.questionsProcessed}`)
  console.log(`Questions tagged: ${bulk.questionsTagged}`)
  console.log(`Total tags: ${bulk.totalTags}`)
  console.log(`Low-confidence tags (<0.6): ${bulk.lowConfidenceTags}`)
  console.log(`Rejected hallucinated objective numbers: ${bulk.rejectedHallucinations}`)
  if (bulk.failures.length) {
    console.log(`Failures: ${bulk.failures.length}`)
    for (const f of bulk.failures.slice(0, 5)) {
      console.log(`  Q${f.question_number}: ${f.error}`)
    }
  }

  if (auditResult) {
    const pct = (auditResult.primaryAccuracy * 100).toFixed(1)
    console.log(`\nStratified audit (n=${auditResult.sampleSize}, ${auditResult.samplingMethod}):`)
    console.log(`  Per-paper counts: ${JSON.stringify(auditResult.perPaperCounts)}`)
    console.log(`  Primary tag accuracy: ${pct}% (target ≥${TAG_ACCURACY_TARGET * 100}%)`)
    if (auditResult.secondarySampleSize > 0) {
      console.log(
        `  Secondary tag accuracy: ${(auditResult.secondaryAccuracy * 100).toFixed(1)}% (n=${auditResult.secondarySampleSize} with 2+ tags)`
      )
    }
    if (!auditResult.meetsTarget) {
      console.log(
        '\n⚠ Below 90% — tune topic-tagger-prompts.ts and re-run before bulk extraction.'
      )
      process.exit(2)
    }
  }

  if (calibration) {
    console.log('\nConfidence calibration probe (multi-topic synthetic question):')
    console.log(
      `  Tags: ${calibration.tags.map((t) => `${t.objective_number}@${t.confidence.toFixed(2)}`).join(', ') || '(none)'}`
    )
    console.log(
      `  Range: ${calibration.minConfidence?.toFixed(2) ?? '—'}–${calibration.maxConfidence?.toFixed(2) ?? '—'}, spread OK: ${calibration.spreadObserved}`
    )
  }

  const failed = bulk.results.filter((r) => r.tagging_failed)
  if (failed.length) {
    console.log(`\n⚠ ${failed.length} question(s) need manual review (tagging_failed):`)
    for (const f of failed) {
      console.log(`  Q${f.question_number}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
