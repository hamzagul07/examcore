import fs from 'fs'
import path from 'path'
import { SYLLABUS_OUTCOMES } from '@/lib/courses/syllabus-objectives'
import { verifyPublishedLessonJson } from './verify-published-lesson'
import { createGuardedWriter } from './guardrail'

export type MetadataBackfillResult = {
  filePath: string
  subjectCode: string
  topicCode: string
  added: string[]
  skipped: boolean
  reason?: string
}

export type MetadataBackfillReport = {
  runAt: string
  scanned: number
  updated: number
  skipped: number
  results: MetadataBackfillResult[]
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

function walkPublishedLessons(
  subjectCode: string,
  projectRoot: string
): Array<{ rel: string; abs: string }> {
  const root = path.join(projectRoot, 'content', 'courses', subjectCode)
  const out: Array<{ rel: string; abs: string }> = []
  if (!fs.existsSync(root)) return out

  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (shouldSkipDir(ent.name)) continue
        walk(abs)
        continue
      }
      if (shouldSkipFile(ent.name)) continue
      out.push({
        rel: path.relative(projectRoot, abs).split(path.sep).join('/'),
        abs,
      })
    }
  }
  walk(root)
  return out
}

function objectivesForTopic(subjectCode: string, topicCode: string): string[] {
  return (SYLLABUS_OUTCOMES[subjectCode] ?? [])
    .filter((o) => o.topic === topicCode)
    .map((o) => o.code)
    .sort()
}

function failsOnlyOnCoverage(issueCodes: string[]): boolean {
  if (!issueCodes.length) return false
  return issueCodes.every((c) => c === 'low_coverage_score')
}

export function backfillLessonMetadata(
  absPath: string,
  relPath: string,
  subjectCode: string,
  writer: ReturnType<typeof createGuardedWriter>
): MetadataBackfillResult {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(fs.readFileSync(absPath, 'utf8')) as Record<string, unknown>
  } catch {
    return {
      filePath: relPath,
      subjectCode,
      topicCode: '',
      added: [],
      skipped: true,
      reason: 'json_parse',
    }
  }

  const status = raw.status as string | undefined
  if (status !== 'premium' && status !== 'published') {
    return {
      filePath: relPath,
      subjectCode,
      topicCode: String(raw.topicCode ?? ''),
      added: [],
      skipped: true,
      reason: 'not_published',
    }
  }

  const topicCode = String(raw.topicCode ?? '')
  if (!topicCode) {
    return {
      filePath: relPath,
      subjectCode,
      topicCode: '',
      added: [],
      skipped: true,
      reason: 'no_topic_code',
    }
  }

  const audit = verifyPublishedLessonJson(raw, relPath, subjectCode, {
    auditStrict: true,
  })
  const errorCodes = audit.issues.filter((i) => i.severity === 'error').map((i) => i.code)

  if (!failsOnlyOnCoverage(errorCodes)) {
    return {
      filePath: relPath,
      subjectCode,
      topicCode,
      added: [],
      skipped: true,
      reason: errorCodes.length ? `other_failures:${errorCodes.join(',')}` : 'already_passes',
    }
  }

  const official = objectivesForTopic(subjectCode, topicCode)
  if (!official.length) {
    return {
      filePath: relPath,
      subjectCode,
      topicCode,
      added: [],
      skipped: true,
      reason: 'no_local_objectives',
    }
  }

  const existing = Array.isArray(raw.syllabusObjectivesCovered)
    ? (raw.syllabusObjectivesCovered as string[])
    : []
  const merged = [...new Set([...existing, ...official])].sort()

  if (merged.length === existing.length && merged.every((c, i) => c === existing[i])) {
    return {
      filePath: relPath,
      subjectCode,
      topicCode,
      added: [],
      skipped: true,
      reason: 'objectives_already_complete',
    }
  }

  const added = official.filter((c) => !existing.includes(c))
  const updated = { ...raw, syllabusObjectivesCovered: merged }
  writer.writeFile(relPath, `${JSON.stringify(updated, null, 2)}\n`)

  return { filePath: relPath, subjectCode, topicCode, added, skipped: false }
}

export function runMetadataBackfill(opts: {
  projectRoot?: string
  subjectCodes?: string[]
}): MetadataBackfillReport {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const subjects =
    opts.subjectCodes ??
    fs
      .readdirSync(path.join(projectRoot, 'content', 'courses'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !shouldSkipDir(d.name))
      .map((d) => d.name)

  process.env.COURSE_AUTONOMY = '1'
  const writer = createGuardedWriter()
  const results: MetadataBackfillResult[] = []

  for (const subjectCode of subjects.sort()) {
    for (const { rel, abs } of walkPublishedLessons(subjectCode, projectRoot)) {
      results.push(backfillLessonMetadata(abs, rel, subjectCode, writer))
    }
  }

  const updated = results.filter((r) => !r.skipped).length
  return {
    runAt: new Date().toISOString(),
    scanned: results.length,
    updated,
    skipped: results.length - updated,
    results,
  }
}
