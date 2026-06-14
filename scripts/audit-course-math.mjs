#!/usr/bin/env node
/** Audit course lessons for odd $ math delimiters. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const { lessonHasOddMathDelimiters } = await import('../lib/courses/sanitize-lesson-math.ts')
  const coursesDir = path.join(ROOT, 'content', 'courses')
  const issues = []

  for (const code of fs.readdirSync(coursesDir)) {
    const dir = path.join(coursesDir, code)
    if (!fs.statSync(dir).isDirectory()) continue

    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      if (lessonHasOddMathDelimiters(lesson)) {
        issues.push({ code, slug: lesson.slug ?? f.replace('.json', ''), topic: lesson.topicCode })
      }
    }
  }

  console.log(`\nCourse math delimiter audit`)
  console.log(`Issues remaining: ${issues.length}`)
  if (issues.length) {
    for (const i of issues.slice(0, 20)) {
      console.log(`  ${i.code}/${i.slug} (${i.topic})`)
    }
    if (issues.length > 20) console.log(`  ... and ${issues.length - 20} more`)
  }

  const reportDir = path.join(ROOT, 'docs', 'content-generation')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(
    path.join(reportDir, 'course-math-audit.json'),
    JSON.stringify({ issues, count: issues.length }, null, 2)
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
