#!/usr/bin/env node
/**
 * Promote a paper-scoped .pilot.json to flat published lesson JSON.
 *
 * Usage:
 *   npx tsx scripts/promote-pilot-lesson.mjs --code=9701 --paper=2 --topic=13.1
 *   npx tsx scripts/promote-pilot-lesson.mjs --code=9701 --paper=2 --topic=13.1 --status=premium
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function getArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

async function main() {
  const code = getArg('code')
  const paper = getArg('paper')
  const topic = getArg('topic')
  const status = getArg('status') ?? 'pilot'

  if (!code || !paper || !topic) {
    console.error('Usage: npx tsx scripts/promote-pilot-lesson.mjs --code=9701 --paper=2 --topic=13.1')
    process.exit(1)
  }

  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
  const { pilotLessonPath } = await import('../lib/courses/paths.ts')
  const { getSyllabusByCode } = await import('../lib/syllabi/index.ts')

  const topics = getSyllabusByCode(code) ?? []
  const leaf = topics.find((t) => t.code === topic)
  const slug = topicToLessonSlug(topic, leaf?.name ?? topic)
  const pilotPath = pilotLessonPath(code, paper, slug)

  if (!fs.existsSync(pilotPath)) {
    console.error(`Pilot not found: ${pilotPath}`)
    process.exit(1)
  }

  const lesson = JSON.parse(fs.readFileSync(pilotPath, 'utf8'))
  lesson.status = status
  lesson.updated = new Date().toISOString().slice(0, 10)

  const outPath = path.join(ROOT, 'content', 'courses', code, `${slug}.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
  console.log(`Promoted ${pilotPath} → ${outPath} (${status})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
