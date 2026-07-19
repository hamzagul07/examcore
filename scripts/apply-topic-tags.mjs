#!/usr/bin/env node
/**
 * Apply the reviewed topic-tag proposals to mark_schemes.syllabus_tags.
 *
 * Reads the dry-run proposal file (scratchpad/topic-tag-proposals.json) and sets
 * syllabus_tags = [topicCode] for each proposed row — but ONLY for rows that are
 * still untagged (never clobbers existing curation). Writes a rollback file of
 * affected IDs so the change can be reverted.
 *
 * Safety: prints a plan by default. Pass --apply to actually write.
 * Usage: node scripts/apply-topic-tags.mjs [--apply] [--proposals=<path>]
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq < 0) continue
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (process.env[k] === undefined) process.env[k] = v
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const SCRATCH = '/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/1382b0da-c368-4c8b-991d-9aab8a0c5db8/scratchpad'
const PROPOSALS = (args.find((a) => a.startsWith('--proposals=')) || '').split('=')[1] || join(SCRATCH, 'topic-tag-proposals.json')
const CONCURRENCY = 8

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { proposals } = JSON.parse(readFileSync(PROPOSALS, 'utf8'))
if (!Array.isArray(proposals) || !proposals.length) { console.error('No proposals found'); process.exit(1) }

// One tag per row; de-dup by id (first wins).
const byId = new Map()
for (const p of proposals) if (p.id && p.topicCode && !byId.has(p.id)) byId.set(p.id, p.topicCode)
const items = [...byId.entries()].map(([id, topicCode]) => ({ id, topicCode }))

const bySubject = {}
for (const p of proposals) { bySubject[p.subject] = (bySubject[p.subject] || 0) + 1 }
console.log('Proposal counts by subject:', bySubject)
console.log(`Unique rows to tag: ${items.length}`)
console.log(APPLY ? '\n*** APPLY MODE — writing to production mark_schemes ***\n' : '\n(plan only — pass --apply to write)\n')

if (!APPLY) {
  console.log('Sample of first 10 writes:')
  for (const it of items.slice(0, 10)) console.log(`  ${it.id} → [${it.topicCode}]`)
  process.exit(0)
}

async function mapConcurrent(list, limit, fn) {
  const out = new Array(list.length); let next = 0
  const worker = async () => { while (next < list.length) { const i = next++; out[i] = await fn(list[i], i) } }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker))
  return out
}

const rollback = []      // { id } that we actually changed (were untagged)
let wrote = 0, skipped = 0, errors = 0

await mapConcurrent(items, CONCURRENCY, async (it) => {
  // Re-check current state; only tag rows still untagged (never clobber).
  const { data: cur, error: readErr } = await sb
    .from('mark_schemes').select('id,syllabus_tags').eq('id', it.id).maybeSingle()
  if (readErr || !cur) { errors++; return }
  if (Array.isArray(cur.syllabus_tags) && cur.syllabus_tags.length > 0) { skipped++; return }
  const { error: upErr } = await sb
    .from('mark_schemes').update({ syllabus_tags: [it.topicCode] }).eq('id', it.id)
  if (upErr) { errors++; return }
  rollback.push(it.id); wrote++
})

const rbPath = join(SCRATCH, 'topic-tags-rollback.json')
writeFileSync(rbPath, JSON.stringify({ appliedAt: new Date().toISOString(), ids: rollback }, null, 2) + '\n')
console.log(`\nWrote: ${wrote}, skipped (already tagged): ${skipped}, errors: ${errors}`)
console.log(`Rollback IDs saved to ${rbPath} (${rollback.length} ids)`)
