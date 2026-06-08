#!/usr/bin/env node
/** Reset zero-cost failed/running extraction_jobs for re-processing on resume. */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
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

async function main() {
  loadEnv()
  const subject = process.argv.find((a) => a.startsWith('--subject='))?.slice('--subject='.length) ?? '9702'
  const { createClient: _ } = await import('@supabase/supabase-js')
  const { resetSilentFailureJobs } = await import('../lib/extraction/extraction-jobs.ts')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const n = await resetSilentFailureJobs(supabase, subject)
  console.log(`Reset ${n} zero-cost failed/running/completed jobs for ${subject}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
