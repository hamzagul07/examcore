import fs from 'fs'
import path from 'path'

const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

/** Static route segments for paper-scoped pilot lessons (e.g. paper-2/4-2-equilibrium-of-forces). */
export function getPaperPilotStaticParams(): { code: string; slug: string[] }[] {
  const params: { code: string; slug: string[] }[] = []

  if (!fs.existsSync(COURSES_DIR)) return params

  for (const code of fs.readdirSync(COURSES_DIR)) {
    const subjectDir = path.join(COURSES_DIR, code)
    if (!fs.statSync(subjectDir).isDirectory()) continue

    for (const entry of fs.readdirSync(subjectDir)) {
      const paperMatch = entry.match(/^paper-(\d+)$/)
      if (!paperMatch) continue

      const paperDir = path.join(subjectDir, entry)
      if (!fs.statSync(paperDir).isDirectory()) continue

      for (const file of fs.readdirSync(paperDir)) {
        if (!file.endsWith('.pilot.json')) continue
        const lessonSlug = file.replace(/\.pilot\.json$/, '')
        params.push({ code, slug: [entry, lessonSlug] })
      }
    }
  }

  return params
}
