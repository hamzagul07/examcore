#!/usr/bin/env node
/**
 * Phase 5 (Prompt B v3) — generate paper-scoped pilot lessons.
 *
 * Usage:
 *   npx tsx scripts/generate-pilot-lessons.mjs
 *   npx tsx scripts/generate-pilot-lessons.mjs --subject=9702 --tuple=1/2.1
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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
  let subject = '9702'
  let tuples = null

  for (const arg of argv) {
    if (arg.startsWith('--subject=')) subject = arg.slice('--subject='.length)
    else if (arg.startsWith('--tuple=')) {
      tuples = tuples ?? []
      const [paper, topic] = arg.slice('--tuple='.length).split('/')
      tuples.push({ paperNumber: paper, topicCode: topic })
    }
  }

  return { subject, tuples }
}

async function main() {
  loadEnv()

  const useVertex = ['true', '1', 'yes'].includes(
    (process.env.USE_VERTEX_AI ?? '').trim().toLowerCase()
  )
  if (useVertex && !process.env.GOOGLE_CLOUD_PROJECT?.trim()) {
    console.error('GOOGLE_CLOUD_PROJECT required when USE_VERTEX_AI=true')
    process.exit(1)
  } else if (!useVertex && !process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required (or set USE_VERTEX_AI=true)')
    process.exit(1)
  }

  const args = parseArgs(process.argv.slice(2))
  const { PILOT_TUPLES, GENERATOR_VERSION } = await import('../lib/courses/generator/constants.ts')
  const { generateLesson } = await import('../lib/courses/generator/generate-lesson.ts')

  const targets = args.tuples ?? PILOT_TUPLES.map((t) => ({
    paperNumber: t.paperNumber,
    topicCode: t.topicCode,
    label: t.label,
  }))

  const supabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : undefined

  const results = []

  for (const t of targets) {
    const label = t.label ?? `P${t.paperNumber}/${t.topicCode}`
    console.log(`\nGenerating ${label}...`)
    try {
      const result = await generateLesson({
        subjectCode: args.subject,
        paperNumber: t.paperNumber,
        topicCode: t.topicCode,
        supabase,
        skipAnswerabilityLlm: false,
      })
      results.push({
        tuple: `${t.paperNumber}/${t.topicCode}`,
        label,
        ok: result.validation.ok,
        attempts: result.attempts,
        outputPath: result.outputPath,
        coverage: result.validation.coverageScore,
        answerability: result.validation.answerabilityScore,
        issues: result.validation.issues,
        slug: result.lesson.slug,
      })
      console.log(`  ✓ ${result.outputPath} (${result.attempts} attempt(s))`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({
        tuple: `${t.paperNumber}/${t.topicCode}`,
        label,
        ok: false,
        error: msg,
      })
      console.error(`  ✗ ${msg}`)
    }
  }

  const reportDir = join(ROOT, 'docs', 'content-generation')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, 'pilot-report.md')
  const lines = [
    '# Pilot lesson generation report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Subject:** ${args.subject}`,
    `**Generator:** ${GENERATOR_VERSION}`,
    '',
    '| Tuple | Slug | Status | Attempts | Coverage | Answerability | Output |',
    '|-------|------|--------|----------|----------|---------------|--------|',
  ]

  for (const r of results) {
    if (r.ok === false && r.error) {
      lines.push(`| ${r.tuple} | — | FAILED | — | — | — | ${r.error.slice(0, 80)} |`)
      continue
    }
    lines.push(
      `| ${r.tuple} | ${r.slug} | ${r.ok ? 'PASS' : 'WARN'} | ${r.attempts} | ${r.coverage?.toFixed(2) ?? 'n/a'} | ${r.answerability?.toFixed(2) ?? 'n/a'} | \`${r.outputPath}\` |`
    )
    if (r.issues?.length) {
      for (const i of r.issues.filter((x) => x.severity === 'warning')) {
        lines.push(`| | | ⚠ ${i.code} | | | | ${i.message.slice(0, 60)} |`)
      }
    }
  }

  lines.push('', '## Review checklist', '')
  lines.push('- [ ] Open each `.pilot.json` in preview (`?pilot=1` when wired)')
  lines.push('- [ ] Verify worked examples match source question IDs')
  lines.push('- [ ] Confirm paper scope (no P1/P2 bleed)')
  lines.push('- [ ] Approve before overwriting published lessons')

  writeFileSync(reportPath, lines.join('\n'))
  console.log(`\nReport: ${reportPath}`)

  const failed = results.filter((r) => r.ok === false)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
