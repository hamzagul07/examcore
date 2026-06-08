#!/usr/bin/env node
/** Verify s24 pilot tagging acceptance checks in Supabase. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: q6 } = await supabase
    .from('extracted_questions')
    .select('id, question_number, paper_number, variant')
    .eq('subject_code', '9702')
    .eq('session', 'May/June')
    .eq('variant', '12')
    .eq('question_number', '6')
    .maybeSingle()

  const { data: q30 } = await supabase
    .from('extracted_questions')
    .select('id, question_number, paper_number, variant')
    .eq('subject_code', '9702')
    .eq('session', 'May/June')
    .eq('variant', '12')
    .eq('question_number', '30')
    .maybeSingle()

  for (const label of [['Q6', q6], ['Q30', q30]]) {
    const [name, q] = label
    if (!q) {
      console.log(`${name}: question not found in DB`)
      continue
    }
    const { data: tags } = await supabase
      .from('question_topic_tags')
      .select('topic_code, confidence, tagged_by, objective_id, syllabus_objectives(objective_number, objective_text)')
      .eq('question_id', q.id)
    console.log(`\n${name} (${q.id}):`)
    if (!tags?.length) {
      console.log('  NO TAGS')
    } else {
      for (const t of tags) {
        const obj = t.syllabus_objectives
        console.log(
          `  ${obj?.objective_number}: ${obj?.objective_text} (conf=${t.confidence}, by=${t.tagged_by})`
        )
      }
    }
  }

  const { count: leafTagged } = await supabase
    .from('question_topic_tags')
    .select('question_id', { count: 'exact', head: true })

  const { data: lowConf } = await supabase
    .from('question_topic_tags')
    .select('confidence, question_id')
    .lt('confidence', 0.6)

  console.log(`\nTotal tag rows: ${leafTagged ?? 0}`)
  console.log(`Low-confidence tags (<0.6): ${lowConf?.length ?? 0}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
