#!/usr/bin/env node
/**
 * Build-time cache: tagged past-paper questions grouped by lesson topic, for the
 * /past-papers/[code]/[topic] pages. Reads mark_schemes.syllabus_tags (lesson
 * topic_codes) + the course lesson taxonomy. Only topics with >= MIN_QUESTIONS
 * are emitted (anti-thin-content). Stems are truncated (short-excerpt + CTA).
 *
 * Usage: node scripts/generate-topic-questions-cache.mjs            # all tagged subjects
 *        node scripts/generate-topic-questions-cache.mjs --subject=9702
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
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

const MIN_QUESTIONS = 3
const MAX_QUESTIONS = 12
const STEM_MAX = 130
const args = process.argv.slice(2)
const ONLY = (args.find((a) => a.startsWith('--subject=')) || '').split('=')[1] || null
const OUT = join(ROOT, 'lib', 'past-paper-topics-cache.json')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function sessionCodeFromName(name) {
  const ym = (name || '').match(/(\d{4})/); const yy = ym ? ym[1].slice(-2) : '24'
  const l = (name || '').toLowerCase()
  const s = l.includes('may') ? 's' : l.includes('october') ? 'w' : l.includes('february') ? 'm' : 's'
  return `${s}${yy}`
}
function sessionLabelFromName(name) { return (name || '').trim() }
function topicSlug(lessonSlug) { return (lessonSlug || '').replace(/^[0-9]+-[0-9]+[a-z]?-/, '') }
function excerpt(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > STEM_MAX ? t.slice(0, STEM_MAX).replace(/\s+\S*$/, '') + '…' : t
}
function markHref(code, paperCode, sessionCode, qnum) {
  return `/mark?subject=${code}&paper=${encodeURIComponent(paperCode)}&session=${sessionCode}&question=${encodeURIComponent(qnum)}`
}

function lessonsForSubject(code) {
  const dir = join(ROOT, 'content', 'courses', code)
  if (!existsSync(dir)) return []
  const out = []
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      if (j.topicCode && j.slug && j.title) out.push({ topicCode: j.topicCode, slug: j.slug, title: j.title })
    } catch {}
  }
  return out
}

const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const SUBJECTS = ONLY ? [ONLY] : Object.keys(JSON.parse(readFileSync(join(ROOT, 'lib', 'subject-papers-cache.json'), 'utf8')))

for (const code of SUBJECTS) {
  const lessons = lessonsForSubject(code)
  if (!lessons.length) continue
  const seenSlug = new Set()
  const topics = []
  for (const lesson of lessons) {
    const { data } = await sb
      .from('mark_schemes')
      .select('paper_code,paper_session,question_number,question_text,total_marks')
      .like('paper_code', `${code}%`)
      .contains('syllabus_tags', [lesson.topicCode])
      .not('question_text', 'is', null)
      .gte('total_marks', 2)
      .lte('total_marks', MAX_QUESTIONS)
      .order('total_marks', { ascending: false })
      .limit(MAX_QUESTIONS)
    if (!data || data.length < MIN_QUESTIONS) continue
    let slug = topicSlug(lesson.slug)
    if (seenSlug.has(slug)) slug = lesson.slug
    seenSlug.add(slug)
    topics.push({
      topicCode: lesson.topicCode,
      topicSlug: slug,
      lessonSlug: lesson.slug,
      title: lesson.title,
      questionCount: data.length,
      questions: data.map((r) => {
        const sc = sessionCodeFromName(r.paper_session)
        return {
          stem: excerpt(r.question_text),
          marks: r.total_marks ?? null,
          sessionLabel: sessionLabelFromName(r.paper_session),
          paperCode: r.paper_code,
          questionNumber: r.question_number,
          markHref: markHref(code, r.paper_code, sc, r.question_number || '1'),
        }
      }),
    })
  }
  topics.sort((a, b) => a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true }))
  if (topics.length) existing[code] = topics
  else delete existing[code]
  console.log(`${code}: ${topics.length} topic pages (>= ${MIN_QUESTIONS} questions)`)
}

writeFileSync(OUT, JSON.stringify(existing, null, 2) + '\n')
console.log(`Wrote ${OUT}`)
