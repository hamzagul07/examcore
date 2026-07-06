import fs from 'fs'
import path from 'path'
import { createGuardedWriter } from './guardrail'
import { verifyPublishedLessonJson } from './verify-published-lesson'
import type { CourseLesson } from '@/lib/courses/types'

export type VisualConsolidationReport = {
  runAt: string
  scanned: number
  updated: number
  flagged: number
  files: string[]
  flaggedPaths: string[]
}

function shouldSkipDir(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

function shouldSkipFile(name: string): boolean {
  if (!name.endsWith('.json')) return true
  if (name.endsWith('.pilot.json') || name.endsWith('.shadow.json')) return true
  if (name.includes('.improve.')) return true
  return false
}

/**
 * Keep one primary visual. Priority: static diagram > diagramSpec > interactiveEmbed.
 * Removes duplicate primary visuals deterministically.
 */
export function consolidateLessonVisuals(lesson: CourseLesson): {
  lesson: CourseLesson
  changed: boolean
} {
  const hasDiagram = Boolean(lesson.diagram?.src)
  const hasDiagramSpec = Boolean(lesson.diagramSpec)
  const hasInteractive = Boolean(lesson.interactiveEmbed)

  const count = (hasDiagram ? 1 : 0) + (hasDiagramSpec ? 1 : 0) + (hasInteractive ? 1 : 0)
  if (count <= 1) return { lesson, changed: false }

  const next: CourseLesson = { ...lesson }

  if (hasDiagram) {
    delete next.diagramSpec
    delete next.interactiveEmbed
  } else if (hasDiagramSpec) {
    delete next.interactiveEmbed
  }

  return { lesson: next, changed: true }
}

export function runVisualConsolidation(opts: {
  projectRoot?: string
  relPaths?: string[]
}): VisualConsolidationReport {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const coursesRoot = path.join(projectRoot, 'content', 'courses')
  process.env.COURSE_AUTONOMY = '1'
  const writer = createGuardedWriter()

  const files: string[] = []
  const flaggedPaths: string[] = []
  let scanned = 0
  let updated = 0
  let flagged = 0

  const processFile = (rel: string) => {
    const abs = path.join(projectRoot, rel)
    if (!fs.existsSync(abs)) return

    const subjectCode = rel.split('/')[2] ?? ''
    let raw: CourseLesson
    try {
      raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as CourseLesson
    } catch {
      return
    }

    if (raw.status !== 'premium' && raw.status !== 'published') return
    scanned += 1

    const before = verifyPublishedLessonJson(raw, rel, subjectCode, { auditStrict: true })
    if (!before.issues.some((i) => i.code === 'multiple_visuals')) return

    const { lesson, changed } = consolidateLessonVisuals(raw)
    if (!changed) {
      flagged += 1
      flaggedPaths.push(rel)
      return
    }

    const after = verifyPublishedLessonJson(lesson, rel, subjectCode, { auditStrict: true })
    if (after.issues.some((i) => i.code === 'multiple_visuals')) {
      flagged += 1
      flaggedPaths.push(rel)
      return
    }

    writer.writeFile(rel, `${JSON.stringify(lesson, null, 2)}\n`)
    files.push(rel)
    updated += 1
  }

  if (opts.relPaths?.length) {
    for (const rel of opts.relPaths) processFile(rel)
  } else if (fs.existsSync(coursesRoot)) {
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          if (shouldSkipDir(ent.name)) continue
          walk(abs)
          continue
        }
        if (shouldSkipFile(ent.name)) continue
        const rel = path.relative(projectRoot, abs).split(path.sep).join('/')
        processFile(rel)
      }
    }
    walk(coursesRoot)
  }

  return {
    runAt: new Date().toISOString(),
    scanned,
    updated,
    flagged,
    files,
    flaggedPaths,
  }
}
