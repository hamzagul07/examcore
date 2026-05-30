#!/usr/bin/env node
/**
 * Add parents[] + parent on leaves for legacy flat JSON (no Gemini).
 * Run: node scripts/migrate-syllabi-parents.mjs [code]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'lib', 'syllabi')

function inferParentCode(leafCode, parentCodes) {
  const sorted = [...parentCodes].sort(
    (a, b) => b.split('.').length - a.split('.').length || b.length - a.length
  )
  for (const p of sorted) {
    if (leafCode === p) continue
    if (leafCode.startsWith(`${p}.`)) return p
  }
  const parts = leafCode.split('.')
  while (parts.length > 1) {
    parts.pop()
    const candidate = parts.join('.')
    if (parentCodes.has(candidate)) return candidate
  }
  return parts[0] || leafCode
}

function migrate(data) {
  const topics = Array.isArray(data.topics) ? data.topics : []
  if (data.parents?.length && topics.every((t) => t.parent)) {
    return { changed: false, data }
  }

  const parentCodes = new Set()
  for (const t of topics) {
    const parts = String(t.code).split('.')
    if (parts.length >= 2) parentCodes.add(parts.slice(0, -1).join('.'))
    parentCodes.add(parts[0])
  }

  const parents = []
  const parentByCode = new Map()
  for (const code of [...parentCodes].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )) {
    const sample = topics.find(
      (t) => t.code === code || String(t.code).startsWith(`${code}.`)
    )
    if (!sample) continue
    const row = {
      code,
      name: code,
      paper: sample.paper || 'P1',
      paperName: sample.paperName || sample.paper || 'P1',
    }
    parents.push(row)
    parentByCode.set(code, row)
  }

  const codeSet = new Set(parents.map((p) => p.code))
  const migratedTopics = topics.map((t) => {
    const parent =
      t.parent?.trim() || inferParentCode(String(t.code), codeSet)
    if (!parentByCode.has(parent)) {
      const row = {
        code: parent,
        name: parent,
        paper: t.paper || 'P1',
        paperName: t.paperName || t.paper || 'P1',
      }
      parents.push(row)
      parentByCode.set(parent, row)
      codeSet.add(parent)
    }
    return { ...t, parent }
  })

  const leafParents = new Set(migratedTopics.map((t) => t.parent))
  const prunedParents = parents.filter((p) => leafParents.has(p.code))

  return {
    changed: true,
    data: {
      ...data,
      extractedAt: new Date().toISOString(),
      parents: prunedParents,
      topics: migratedTopics,
    },
  }
}

const filter = process.argv[2]
const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'))
for (const f of files) {
  const code = f.replace('.json', '')
  if (filter && code !== filter) continue
  const path = join(OUT_DIR, f)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const { changed, data: out } = migrate(data)
  if (changed) {
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n', 'utf8')
    console.log(`Migrated ${code}: ${out.parents.length} parents, ${out.topics.length} leaves`)
  } else {
    console.log(`Skip ${code}: already has parent tree`)
  }
}
