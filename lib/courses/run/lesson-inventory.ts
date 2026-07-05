import fs from 'fs'
import path from 'path'
import type { LessonStatus } from '@/lib/courses/types'

export type InventoriedLesson = {
  slug: string
  topicCode: string
  status: LessonStatus | string
  relativePath: string
}

const SKIP_SUFFIXES = ['.pilot.json', '.shadow.json']

function statusRank(status: string): number {
  if (status === 'premium') return 4
  if (status === 'published') return 3
  if (status === 'pilot') return 2
  if (status === 'outline') return 1
  return 0
}

function shouldSkipFile(name: string): boolean {
  if (!name.endsWith('.json')) return true
  return SKIP_SUFFIXES.some((s) => name.endsWith(s))
}

function readLessonMeta(absPath: string, relativePath: string): InventoriedLesson | null {
  try {
    const raw = JSON.parse(fs.readFileSync(absPath, 'utf8')) as {
      slug?: string
      topicCode?: string
      status?: string
    }
    if (!raw.topicCode) return null
    return {
      slug: raw.slug ?? path.basename(absPath, '.json'),
      topicCode: raw.topicCode,
      status: raw.status ?? 'published',
      relativePath,
    }
  } catch {
    return null
  }
}

/** Walk content/courses/{subjectCode}/ and merge by topicCode (best status wins). */
export function inventoryLessonsForSubject(subjectCode: string): Map<string, InventoriedLesson> {
  const root = path.join(process.cwd(), 'content', 'courses', subjectCode)
  const byTopic = new Map<string, InventoriedLesson>()
  if (!fs.existsSync(root)) return byTopic

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      const rel = path.relative(process.cwd(), abs).split(path.sep).join('/')
      if (entry.isDirectory()) {
        walk(abs)
        continue
      }
      if (shouldSkipFile(entry.name)) continue
      const meta = readLessonMeta(abs, rel)
      if (!meta) continue
      const prev = byTopic.get(meta.topicCode)
      if (!prev || statusRank(String(meta.status)) > statusRank(String(prev.status))) {
        byTopic.set(meta.topicCode, meta)
      }
    }
  }

  walk(root)
  return byTopic
}

/** Resolve content folder name for a syllabus subject code (Cambridge or ib-*). */
export function contentDirForSubjectCode(subjectCode: string): string {
  return subjectCode
}
