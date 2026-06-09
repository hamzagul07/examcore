#!/usr/bin/env node
/**
 * Polish promoted Senpai lessons: remove pilot wording, normalize summaries.
 *
 *   pnpm senpai:polish
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(PROJECT, 'content/courses/9702')

function polishLesson(lesson) {
  if (lesson.generatorVersion !== 'senpai-published-1') return false
  let changed = false

  const paperLabel = lesson.paper?.includes('P4')
    ? 'Paper 4'
    : lesson.paper?.includes('P1')
      ? 'Papers 1 & 2'
      : '9702'

  const cleanSummary = `${paperLabel} — ${lesson.title} (${lesson.topicCode}). Premium notes with Senpai Corner diagrams and live animations.`
  if (lesson.summary !== cleanSummary) {
    lesson.summary = cleanSummary
    changed = true
  }

  lesson.sections = lesson.sections.map((s) => {
    if (s.type !== 'intro' && s.type !== 'text') return s
    let content = s.content
    const before = content
    content = content
      .replace(/\bThis pilot\b/gi, 'This lesson')
      .replace(/\bpilot lesson\b/gi, 'premium lesson')
      .replace(/\bSenpai Corner diagram-backed pilot\b/gi, 'Senpai Corner diagram-backed notes')
      .replace(/\bfor internal review only\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (content !== before) changed = true
    return { ...s, content }
  })

  return changed
}

let count = 0
for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.json')) continue
  const fp = path.join(DIR, file)
  const lesson = JSON.parse(fs.readFileSync(fp, 'utf8'))
  if (polishLesson(lesson)) {
    fs.writeFileSync(fp, `${JSON.stringify(lesson, null, 2)}\n`)
    count++
  }
}
console.log(`Polished ${count} published lessons`)
