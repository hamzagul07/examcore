#!/usr/bin/env node
/**
 * Generate lib/syllabi/REVIEW.md from extracted JSON trees.
 *
 * Run: node scripts/generate-syllabi-review.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SYLLABI_DIR = join(ROOT, 'lib', 'syllabi')
const OUT_PATH = join(SYLLABI_DIR, 'REVIEW.md')

const EXPECTED_LEAF_RANGES = {
  '9084': [25, 80],
  '9231': [18, 55],
  '9488': [12, 45],
  '9489': [18, 70],
  '9607': [10, 40],
  '9609': [45, 140],
  '9618': [30, 80],
  '9699': [22, 65],
  '9700': [35, 75],
  '9701': [55, 120],
  '9702': [55, 110],
  '9706': [22, 55],
  '9708': [80, 140],
  '9990': [35, 85],
}

const MATH_CODE = '9709'

function loadJson(code) {
  const path = join(SYLLABI_DIR, `${code}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function formatLeaf(t, parentsByCode) {
  const p = parentsByCode.get(t.parent)
  const parentLabel = p ? `${p.code} ${p.name}` : t.parent
  return `- \`${t.code}\` (parent: ${parentLabel}) — ${t.name} [${t.paper}]`
}

function analyzeSubject(data) {
  const parents = data.parents ?? []
  const topics = data.topics ?? []
  const parentsByCode = new Map(parents.map((p) => [p.code, p]))
  const flags = []

  const range = EXPECTED_LEAF_RANGES[data.subjectCode]
  const inRange = range
    ? topics.length >= range[0] && topics.length <= range[1]
    : null

  if (range && !inRange) {
    flags.push(
      `leaf count ${topics.length} outside expected ${range[0]}–${range[1]}`
    )
  }

  const parentLeafCount = new Map()
  let missingParent = 0
  let emptyPaper = 0
  for (const t of topics) {
    if (!t.parent?.trim()) missingParent++
    if (!t.paper?.trim()) emptyPaper++
    if (t.parent) {
      parentLeafCount.set(t.parent, (parentLeafCount.get(t.parent) || 0) + 1)
    }
  }
  if (missingParent) flags.push(`${missingParent} leaves missing parent`)
  if (emptyPaper) flags.push(`${emptyPaper} leaves with empty paper`)

  const orphanParents = parents.filter((p) => !parentLeafCount.has(p.code))
  if (orphanParents.length) {
    flags.push(`${orphanParents.length} parent(s) with 0 leaves`)
  }
  if (parentLeafCount.size === 1 && topics.length > 15) {
    flags.push('all leaves under a single parent')
  }
  if (topics.length > 0 && parentLeafCount.size > 2) {
    const max = Math.max(...parentLeafCount.values())
    if (max / topics.length > 0.65) {
      flags.push('one parent holds >65% of leaves')
    }
  }
  if (!parents.length && topics.length) {
    flags.push('no parents array (legacy flat file?)')
  }
  for (const t of topics) {
    if (!t.parent) flags.push('leaf without parent field')
    break
  }

  const orderedParents = [...parents].sort((a, b) =>
    String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
  )

  const sampleLeaves = []
  const pickFromParent = (p) => {
    const leaves = topics.filter((t) => t.parent === p.code)
    if (!leaves.length) return null
    const mid = leaves[Math.floor(leaves.length / 2)]
    return mid
  }

  if (orderedParents.length >= 1) {
    const first = pickFromParent(orderedParents[0])
    if (first) sampleLeaves.push({ label: 'first parent', leaf: first })
  }
  if (orderedParents.length >= 2) {
    const midP = orderedParents[Math.floor(orderedParents.length / 2)]
    const mid = pickFromParent(midP)
    if (mid) sampleLeaves.push({ label: 'middle parent', leaf: mid })
  }
  if (orderedParents.length >= 1) {
    const lastP = orderedParents[orderedParents.length - 1]
    const last = pickFromParent(lastP)
    if (last && !sampleLeaves.some((s) => s.leaf.code === last.code)) {
      sampleLeaves.push({ label: 'last parent', leaf: last })
    }
  }

  while (sampleLeaves.length < 3 && topics.length > sampleLeaves.length) {
    const extra = topics[sampleLeaves.length]
    if (extra && !sampleLeaves.some((s) => s.leaf.code === extra.code)) {
      sampleLeaves.push({ label: 'extra', leaf: extra })
    } else break
  }

  const needsReview = flags.length > 0

  return {
    inRange,
    range,
    flags,
    needsReview,
    sampleLeaves,
    parentCount: parents.length,
    leafCount: topics.length,
    parentsByCode,
  }
}

function main() {
  const codes = readdirSync(SYLLABI_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort()

  const lines = [
    '# Syllabus extraction review',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Eyeball this checklist before Sprint B wires parent → leaf trees in the UI.',
    '',
    `Math **${MATH_CODE}** is maintained in \`lib/syllabus.ts\` (not in this folder unless re-extracted).`,
    '',
  ]

  let flaggedCount = 0

  for (const code of codes) {
    const data = loadJson(code)
    if (!data) continue
    const a = analyzeSubject(data)
    if (a.needsReview) flaggedCount++

    const rangeStr = a.range
      ? `${a.range[0]}–${a.range[1]}`
      : 'no range defined'
    const rangeOk =
      a.inRange === null ? 'n/a' : a.inRange ? '✓ in range' : '⚠ outside range'

    lines.push(`## ${data.subjectCode} — ${data.subjectName}`)
    lines.push('')
    lines.push(`| Metric | Value |`)
    lines.push(`|--------|-------|`)
    lines.push(`| Leaf count | ${a.leafCount} (${rangeOk}; expected ${rangeStr}) |`)
    lines.push(`| Parent count | ${a.parentCount} |`)
    lines.push(
      `| Needs review | ${a.needsReview ? '**YES**' : 'No'} |`
    )
    if (data.extractedAt) {
      lines.push(`| Extracted | ${data.extractedAt} |`)
    }
    lines.push('')
    if (a.flags.length) {
      lines.push('**Flags:**')
      for (const f of a.flags) lines.push(`- ${f}`)
      lines.push('')
    }
    lines.push('**Sample leaves:**')
    for (const s of a.sampleLeaves.slice(0, 5)) {
      lines.push(formatLeaf(s.leaf, a.parentsByCode))
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(
    `**Summary:** ${codes.length} JSON file(s), ${flaggedCount} flagged for review.`
  )

  writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8')
  console.log(`Wrote ${OUT_PATH} (${codes.length} subjects, ${flaggedCount} flagged)`)
}

main()
