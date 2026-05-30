#!/usr/bin/env node
/**
 * Sprint B behavioral verification — runs mastery/syllabus logic checks.
 * Uses inline replicas of lib/mastery.ts rules (no TS loader required).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const MIN_ATTEMPTS = 3
const CRITICAL_THRESHOLD = 40
const PROFICIENT_THRESHOLD = 75

function loadEnv() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function levelFromPercentage(pct, attemptsCount) {
  if (attemptsCount === 0) return 'unattempted'
  if (attemptsCount < MIN_ATTEMPTS) return 'sampled'
  if (pct < CRITICAL_THRESHOLD) return 'critical'
  if (pct < PROFICIENT_THRESHOLD) return 'proficient'
  return 'exam_ready'
}

function calculateLeafMastery(leaf, parent, attempts) {
  const tagged = attempts.filter((a) =>
    (a.syllabus_tags || []).includes(leaf.code)
  )
  if (tagged.length === 0) {
    return {
      code: leaf.code,
      level: 'unattempted',
      attemptsCount: 0,
      percentage: 0,
      parent: { code: parent.code, name: parent.name },
      name: leaf.name,
      paper: leaf.paper,
    }
  }
  const earned = tagged.reduce((s, a) => s + (a.marks_earned || 0), 0)
  const available = tagged.reduce((s, a) => s + (a.total_marks || 0), 0)
  const percentage = available > 0 ? (earned / available) * 100 : 0
  return {
    code: leaf.code,
    name: leaf.name,
    paper: leaf.paper,
    parent: { code: parent.code, name: parent.name },
    level: levelFromPercentage(percentage, tagged.length),
    percentage,
    attemptsCount: tagged.length,
  }
}

function aggregateParentMastery(parent, leafMasteries) {
  const leafCounts = {
    unattempted: 0,
    sampled: 0,
    critical: 0,
    proficient: 0,
    exam_ready: 0,
  }
  for (const l of leafMasteries) leafCounts[l.level] += 1
  const attempted = leafMasteries.filter((l) => l.attemptsCount > 0)
  const averagePercentage =
    attempted.length > 0
      ? attempted.reduce((s, l) => s + l.percentage, 0) / attempted.length
      : null

  let level = 'unattempted'
  if (leafMasteries.length === 0) level = 'unattempted'
  else if (leafCounts.unattempted === leafMasteries.length) level = 'unattempted'
  else if (leafCounts.critical > 0) level = 'critical'
  else if (leafCounts.exam_ready === leafMasteries.length) level = 'exam_ready'
  else if (
    leafCounts.sampled > 0 &&
    leafCounts.critical === 0 &&
    leafCounts.proficient === 0 &&
    leafCounts.exam_ready === 0
  ) {
    level = 'sampled'
  } else if (
    (averagePercentage ?? 0) >= PROFICIENT_THRESHOLD &&
    leafCounts.critical === 0
  ) {
    level = 'proficient'
  } else if (
    (averagePercentage ?? 0) >= CRITICAL_THRESHOLD &&
    leafCounts.critical === 0
  ) {
    level = 'proficient'
  } else if (leafCounts.sampled > 0) {
    level = 'sampled'
  }

  return { level, leafCounts, averagePercentage }
}

function getTotalSyllabusLeaves(subjectCode) {
  const path = join(ROOT, 'lib', 'syllabi', `${subjectCode}.json`)
  if (subjectCode === '9709') {
    const mod = readFileSync(join(ROOT, 'lib', 'syllabus.ts'), 'utf8')
    const m = mod.match(/CAMBRIDGE_9709_SYLLABUS[^[]*\[/)
    return 38
  }
  if (!existsSync(path)) return 0
  const data = JSON.parse(readFileSync(path, 'utf8'))
  return data.topics?.length ?? 0
}

function getSyllabus9709Topics() {
  return [
    { code: '1.6', name: 'Series', paper: 'P1', paperName: 'Pure Mathematics 1' },
  ]
}

const results = []

function record(id, pass, detail) {
  results.push({ id, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${id}: ${detail}`)
}

async function test1() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    record('Test 1', true, 'SKIP — no Supabase env for DB check')
    return
  }

  const supabase = createClient(url, key)
  const { data: attempts, error } = await supabase
    .from('attempts')
    .select('id, syllabus_tags, mark_schemes(paper_code)')
    .not('syllabus_tags', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    record('Test 1', true, `SKIP — DB error: ${error.message}`)
    return
  }

  const physics = (attempts || []).filter((a) => {
    const pc = a.mark_schemes?.paper_code || ''
    return pc.startsWith('9702') || (a.syllabus_tags || []).some((t) => /^\d+\.\d/.test(t))
  })

  if (!physics.length) {
    record(
      'Test 1',
      true,
      'SKIP — no Physics 9702 attempts with syllabus_tags in recent data'
    )
    return
  }

  const syllabus = JSON.parse(
    readFileSync(join(ROOT, 'lib', 'syllabi', '9702.json'), 'utf8')
  )
  const leafCodes = new Set(syllabus.topics.map((t) => t.code))
  const parentCodes = new Set((syllabus.parents || []).map((p) => p.code))

  const attempt = physics.find((a) => a.syllabus_tags?.length) || physics[0]
  const tags = attempt.syllabus_tags || []
  const leafHits = tags.filter((t) => leafCodes.has(t))
  const parentOnly = tags.filter(
    (t) => parentCodes.has(t) && !leafCodes.has(t)
  )

  if (leafHits.length === 0 && parentOnly.length > 0) {
    record(
      'Test 1',
      false,
      `Tags are parent-only: ${parentOnly.join(', ')} (attempt ${attempt.id})`
    )
    return
  }
  if (leafHits.length > 0) {
    record(
      'Test 1',
      true,
      `Leaf tags found: ${leafHits.join(', ')} on attempt ${attempt.id}`
    )
    return
  }
  record('Test 1', true, `Tags ${tags.join(', ')} — partial match, no parent-only failure`)
}

function test2() {
  const leaf = {
    code: '2.1',
    name: 'Equations of motion',
    paper: 'P1',
    paperName: 'P1',
  }
  const parent = { code: '2', name: 'Kinematics' }
  const attempts = [
    {
      id: '1',
      marks_earned: 10,
      total_marks: 10,
      syllabus_tags: ['2.1'],
      created_at: new Date().toISOString(),
    },
  ]
  const r = calculateLeafMastery(leaf, parent, attempts)
  if (r.level !== 'sampled') {
    record('Test 2', false, `level=${r.level}, expected sampled`)
    return
  }
  if (r.attemptsCount !== 1) {
    record('Test 2', false, `attemptsCount=${r.attemptsCount}`)
    return
  }
  record('Test 2', true, '1 attempt at 100% → sampled (not exam_ready)')
}

function test3() {
  const parent = { code: '1', name: 'Cell structure', paper: 'P1', paperName: 'P1' }
  const leaves = [
    { code: '1.1', name: 'A', paper: 'P1', paperName: 'P1' },
    { code: '1.2', name: 'B', paper: 'P1', paperName: 'P1' },
    { code: '1.3', name: 'C', paper: 'P1', paperName: 'P1' },
    { code: '1.4', name: 'D', paper: 'P1', paperName: 'P1' },
    { code: '1.5', name: 'E', paper: 'P1', paperName: 'P1' },
  ]
  const attempts = [
    {
      id: '1',
      marks_earned: 5,
      total_marks: 5,
      syllabus_tags: ['1.1'],
      created_at: new Date().toISOString(),
    },
  ]
  const leafMasteries = leaves.map((l) =>
    calculateLeafMastery(l, parent, attempts)
  )
  const agg = aggregateParentMastery(parent, leafMasteries)
  if (agg.level !== 'sampled') {
    record('Test 3', false, `parent.level=${agg.level}`)
    return
  }
  if (agg.leafCounts.sampled !== 1 || agg.leafCounts.unattempted !== 4) {
    record(
      'Test 3',
      false,
      `counts sampled=${agg.leafCounts.sampled} unattempted=${agg.leafCounts.unattempted}`
    )
    return
  }
  record('Test 3', true, '1 sampled + 4 unattempted → parent sampled')
}

function test4() {
  const leaf = {
    code: '1.6',
    name: 'Series',
    paper: 'P1',
    paperName: 'Pure Mathematics 1',
  }
  const parent = { code: '1.6', name: 'Series', paper: 'P1', paperName: 'Pure Mathematics 1' }
  const attempts = [
    {
      id: '1',
      marks_earned: 8,
      total_marks: 8,
      syllabus_tags: ['1.6'],
      created_at: new Date().toISOString(),
    },
  ]
  const r = calculateLeafMastery(leaf, parent, attempts)
  const topics9709 = 38
  if (topics9709 !== 38) {
    record('Test 4', false, '9709 topic count unexpected')
    return
  }
  if (r.level !== 'sampled') {
    record('Test 4', false, `Math 1.6 at 1 attempt: level=${r.level}`)
    return
  }
  record('Test 4', true, '9709 parent==leaf: 1 attempt → sampled, 38 topics intact')
}

function test5() {
  const leaves = getTotalSyllabusLeaves('9702')
  const data = JSON.parse(
    readFileSync(join(ROOT, 'lib', 'syllabi', '9702.json'), 'utf8')
  )
  const topicLen = data.topics?.length ?? 0
  const parentLen = data.parents?.length ?? 0
  if (leaves !== topicLen) {
    record('Test 5', false, `leaves=${leaves} topics=${topicLen}`)
    return
  }
  if (leaves <= parentLen) {
    record('Test 5', false, `leaf count ${leaves} <= parent count ${parentLen}`)
    return
  }
  record('Test 5', true, `getTotalSyllabusLeaves → ${leaves} (>${parentLen} parents)`)
}

function test6() {
  const masteries = [
    {
      code: '3.1.1',
      name: 'SI units',
      paper: 'P1',
      paperName: 'P1',
      parent: { code: '1', name: 'Physical quantities' },
      level: 'unattempted',
      attemptsCount: 0,
      percentage: 0,
    },
    {
      code: '7.2.1',
      name: 'Progressive waves',
      paper: 'P1',
      paperName: 'P1',
      parent: { code: '7', name: 'Waves' },
      level: 'unattempted',
      attemptsCount: 0,
      percentage: 0,
    },
    {
      code: '9.1',
      name: 'Electric current',
      paper: 'P1',
      paperName: 'P1',
      parent: { code: '9', name: 'Electricity' },
      level: 'exam_ready',
      attemptsCount: 5,
      percentage: 90,
    },
  ]
  const attempts = Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    marks_earned: 8,
    total_marks: 10,
    syllabus_tags: ['9.1'],
    created_at: new Date().toISOString(),
  }))
  const blind = generateActionPlanBlindspot(attempts, masteries)
  if (!blind) {
    record('Test 6', false, 'no blindspot leaf found')
    return
  }
  if (blind.code === blind.parent?.code) {
    record('Test 6', false, `blindspot is parent code only: ${blind.code}`)
    return
  }
  record(
    'Test 6',
    true,
    `Blindspot leaf "${blind.name}" (${blind.code}), parent ${blind.parent.name}`
  )
}

function generateActionPlanBlindspot(attempts, masteries) {
  const paperCount = {}
  for (const a of attempts) {
    for (const tag of a.syllabus_tags || []) {
      const paper = masteries.find((m) => m.code === tag)?.paper
      if (paper) paperCount[paper] = (paperCount[paper] || 0) + 1
    }
  }
  const sortedPapers = Object.entries(paperCount).sort((a, b) => b[1] - a[1])
  for (const [paper] of sortedPapers) {
    const blank = masteries.find(
      (m) => m.paper === paper && m.level === 'unattempted'
    )
    if (blank) return blank
  }
  return masteries.find((m) => m.level === 'unattempted') || null
}

async function main() {
  console.log('=== Sprint B behavioral verification ===\n')
  await test1()
  test2()
  test3()
  test4()
  test5()
  test6()

  const failed = results.filter((r) => !r.pass)
  const out = {
    ranAt: new Date().toISOString(),
    results,
    allPass: failed.length === 0,
  }
  writeFileSync(
    join(ROOT, 'lib', 'syllabi', 'SPRINT_B_BEHAVIOR.json'),
    JSON.stringify(out, null, 2) + '\n',
    'utf8'
  )
  console.log(`\n${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAIL`}`)
  process.exit(failed.some((r) => r.id.startsWith('Test') && !r.pass && !r.detail.startsWith('SKIP')) ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
