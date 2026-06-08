import path from 'path'

const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

/** Legacy flat path: content/courses/{code}/{slug}.json */
export function publishedLessonPath(subjectCode: string, slug: string): string {
  return path.join(COURSES_DIR, subjectCode, `${slug}.json`)
}

/** Paper-scoped pilot path: content/courses/{code}/paper-{n}/{slug}.pilot.json */
export function pilotLessonPath(
  subjectCode: string,
  paperNumber: string,
  slug: string
): string {
  return path.join(COURSES_DIR, subjectCode, `paper-${paperNumber}`, `${slug}.pilot.json`)
}

export function pilotLessonDir(subjectCode: string, paperNumber: string): string {
  return path.join(COURSES_DIR, subjectCode, `paper-${paperNumber}`)
}

/** Paper-scoped published path: content/courses/{code}/paper-{n}/{slug}.json */
export function paperScopedLessonPath(
  subjectCode: string,
  paperNumber: string,
  slug: string
): string {
  return path.join(COURSES_DIR, subjectCode, `paper-${paperNumber}`, `${slug}.json`)
}

/** URL segment for paper-scoped routes, e.g. paper-1 */
export function paperDirFromNumber(paperNumber: string): string {
  return `paper-${paperNumber}`
}

export function paperNumberFromDir(paperDir: string): string | null {
  const m = paperDir.match(/^paper-(\d+)$/)
  return m ? m[1] : null
}
