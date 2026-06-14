#!/usr/bin/env node
/**
 * Repair odd $ math delimiters across all course lesson JSON.
 * Usage: npx tsx scripts/repair-course-math.mjs [--code=9709]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function getArg(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
}

async function main() {
  const { sanitizeLessonMath, lessonHasOddMathDelimiters } = await import(
    '../lib/courses/sanitize-lesson-math.ts'
  )

  const codeFilter = getArg('code')
  const coursesDir = path.join(ROOT, 'content', 'courses')
  const codes = codeFilter
    ? [codeFilter]
    : fs.readdirSync(coursesDir).filter((d) => fs.statSync(path.join(coursesDir, d)).isDirectory())

  let files = 0
  let repairedBefore = 0

  for (const code of codes) {
    const dir = path.join(coursesDir, code)
    if (!fs.existsSync(dir)) continue

    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue
      const fp = path.join(dir, f)
      const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
      if (!raw.sections) continue

      const hadIssues = lessonHasOddMathDelimiters(raw)
      if (hadIssues) repairedBefore++

      const fixed = sanitizeLessonMath(raw)
      const changed = JSON.stringify(fixed) !== JSON.stringify(raw)
      if (changed) {
        fs.writeFileSync(fp, JSON.stringify(fixed, null, 2) + '\n')
        files++
      }
    }
  }

  console.log(`Lessons with odd delimiters before repair: ${repairedBefore}`)
  console.log(`Updated ${files} lesson file(s)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
