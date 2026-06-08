#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const p = join(ROOT, '.env.local')
if (existsSync(p)) {
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const sessions = process.argv.slice(2).length ? process.argv.slice(2) : ['m24']
for (const s of sessions) {
  const { data, error } = await sb.storage.from('paper-pdfs').list(`cambridge/9702/${s}`, { limit: 100 })
  if (error) {
    console.log(s, 'ERROR', error.message)
    continue
  }
  const pdfs = (data ?? []).filter((f) => /\.pdf$/i.test(f.name)).map((f) => f.name).sort()
  console.log(`${s}: ${pdfs.length} PDFs — ${pdfs.join(', ')}`)
}
