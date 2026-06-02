#!/usr/bin/env node
/**
 * One-off rebrand: MarkScheme → MarkScheme (skips localStorage key names).
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(import.meta.dirname, '..')
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'agent-tools'])
const EXT = new Set(['.ts', '.tsx', '.md', '.mjs', '.css', '.json'])

const STORAGE_KEYS = [
  'examcore_last_selection',
  'examcore_pending_question',
  'examcore_pending_upload',
  'examcore_pending_upload_meta',
]

function transform(content) {
  let out = content
  const placeholders = new Map()
  STORAGE_KEYS.forEach((key, i) => {
    const token = `__STORAGE_KEY_${i}__`
    placeholders.set(token, key)
    out = out.split(key).join(token)
  })

  const rules = [
    [/MARKSCHEME/g, 'MARKSCHEME'],
    [/MarkScheme/g, 'MarkScheme'],
    [/markscheme\.ai\/mark/g, 'markscheme.app/mark'],
    [/markscheme\.ai/g, 'markscheme.app'],
    [/hello@markscheme\.ai/g, 'hello@markscheme.app'],
    [/notifications@markscheme\.ai/g, 'notifications@markscheme.app'],
    [/@markscheme-demo\.local/g, '@markscheme-demo.local'],
    [/markscheme-export/g, 'markscheme-export'],
    [/why-i-built-markscheme/g, 'why-i-built-markscheme'],
    [/\bexamcore\b/g, 'markscheme'],
  ]

  for (const [from, to] of rules) {
    out = out.replace(from, to)
  }

  for (const [token, key] of placeholders) {
    out = out.split(token).join(key)
  }

  return out
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, files)
    else if (EXT.has(path.extname(name))) files.push(full)
  }
  return files
}

let changed = 0
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file)
  if (rel === 'scripts/rebrand-markscheme.mjs') continue
  const before = fs.readFileSync(file, 'utf8')
  const after = transform(before)
  if (after !== before) {
    fs.writeFileSync(file, after)
    changed += 1
  }
}

const oldBlog = path.join(ROOT, 'content/blog/why-i-built-markscheme.md')
const newBlog = path.join(ROOT, 'content/blog/why-i-built-markscheme.md')
if (fs.existsSync(oldBlog) && !fs.existsSync(newBlog)) {
  fs.renameSync(oldBlog, newBlog)
  changed += 1
}

console.log(`Rebrand: ${changed} files updated`)
