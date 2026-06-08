import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

for (const subj of process.argv.slice(2).length ? process.argv.slice(2) : ['9709', '9618', '9706', '9708']) {
  const { data } = await sb.storage.from('paper-pdfs').list(`cambridge/${subj}/s24`, { limit: 200 })
  const qp = (data ?? []).filter((f) => /^qp_/i.test(f.name)).length
  const ms = (data ?? []).filter((f) => /^ms_/i.test(f.name)).length
  console.log(`${subj}: ${qp} QPs + ${ms} MSs = ${qp + ms} PDFs`)
}
