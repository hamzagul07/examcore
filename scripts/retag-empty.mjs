#!/usr/bin/env node
/** Re-tag questions that returned empty tags in a prior tagging run. */
import { readFileSync, writeFileSync, existsSync } from 'fs'
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

async function main() {
  loadEnv()
  const tagPath = join(ROOT, 'scripts/extraction-output/topic_tags_9702_s24.json')
  const {
    tagOneQuestion,
    loadSyllabusObjectivesFromJson,
    loadQuestionsFromJson,
  } = await import('../lib/extraction/topic-tagger.ts')

  const payload = JSON.parse(readFileSync(tagPath, 'utf8'))
  const objectives = loadSyllabusObjectivesFromJson(ROOT, '9702')
  const byNumber = new Map(objectives.map((o) => [o.objective_number, o]))
  const questions = loadQuestionsFromJson(ROOT, 's24')
  const byId = new Map(questions.map((q) => [q.id, q]))

  for (const r of payload.results) {
    if (r.tags.length > 0) continue
    const q = byId.get(r.question_id)
    if (!q) continue
    console.log(`Retagging Q${q.question_number} (paper ${q.paper_number})...`)
    const retag = await tagOneQuestion(q, objectives, byNumber)
    Object.assign(r, retag)
    console.log(`  → ${retag.tags.map((t) => t.objective_number).join(', ') || '(still empty)'}`)
  }

  payload.summary.questionsTagged = payload.results.filter((r) => r.tags.length > 0).length
  payload.summary.totalTags = payload.results.reduce((n, r) => n + r.tags.length, 0)
  payload.generatedAt = new Date().toISOString()
  writeFileSync(tagPath, JSON.stringify(payload, null, 2))
  console.log(`Done: ${payload.summary.questionsTagged}/${payload.summary.questionsProcessed} tagged`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
