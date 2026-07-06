import fs from 'fs'
import path from 'path'

export class GuardrailViolation extends Error {
  readonly code = 'guardrail_violation'

  constructor(message: string) {
    super(message)
    this.name = 'GuardrailViolation'
  }
}

/**
 * Paths the autonomous course runner may NEVER write to — enforced in code, not docs.
 * Read access is unrestricted; only writes are blocked.
 */
export const DENY_WRITE_PREFIXES = [
  'lib/billing/',
  'lib/marking/',
  'lib/ib/assessment-catalog/',
  'lib/supabase/',
  'lib/supabase-server.ts',
  'lib/supabase-admin.ts',
  'lib/seo/',
  'supabase/',
  'app/sitemap',
  'app/api/mark/',
  'app/api/billing/',
  'middleware.ts',
  'middleware.js',
] as const

/** Only these relative prefixes may receive writes from autonomous course runs. */
export const ALLOW_WRITE_PREFIXES = [
  'content/courses/',
  'public/courses/diagrams/',
  'docs/content-generation/runs/',
] as const

export function normalizeProjectRelative(targetPath: string): string {
  const abs = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(process.cwd(), targetPath)
  const rel = path.relative(process.cwd(), abs)
  if (rel.startsWith('..')) {
    throw new GuardrailViolation(`Path escapes project root: ${targetPath}`)
  }
  return rel.split(path.sep).join('/')
}

export function isDeniedWritePath(relativePosix: string): boolean {
  return DENY_WRITE_PREFIXES.some(
    (prefix) =>
      relativePosix === prefix.replace(/\/$/, '') ||
      relativePosix.startsWith(prefix)
  )
}

export function isAllowedWritePath(relativePosix: string): boolean {
  return ALLOW_WRITE_PREFIXES.some((prefix) => relativePosix.startsWith(prefix))
}

/**
 * Hard wall: throws unless `relativePosix` is under an allow prefix and not denylisted.
 * Autonomous writes require `COURSE_AUTONOMY=1`.
 */
export function assertWritablePath(
  targetPath: string,
  opts: { requireAutonomyFlag?: boolean } = {}
): string {
  const rel = normalizeProjectRelative(targetPath)

  if (opts.requireAutonomyFlag !== false && !process.env.COURSE_AUTONOMY) {
    throw new GuardrailViolation(
      'Autonomous writes require COURSE_AUTONOMY=1. Read-only runs (coverage_audit) do not write.'
    )
  }

  if (isDeniedWritePath(rel)) {
    throw new GuardrailViolation(
      `Write blocked by denylist: ${rel} (autonomous course runs cannot touch billing, marking core, IB catalog, auth, schema, or SEO).`
    )
  }

  if (!isAllowedWritePath(rel)) {
    throw new GuardrailViolation(
      `Write blocked: ${rel} is outside allowlist (${ALLOW_WRITE_PREFIXES.join(', ')}).`
    )
  }

  return rel
}

/** Phase 3 improvement loop — disabled until marking performance data exists. */
export function assertImprovementLoopEnabled(): void {
  if (process.env.COURSE_IMPROVEMENT_LOOP !== '1') {
    throw new GuardrailViolation(
      'Improvement loop is disabled (COURSE_IMPROVEMENT_LOOP?1). Phase 3 requires courses built + marked performance data per docs/AUTONOMOUS_COURSE_SYSTEM.md.'
    )
  }
}

export function isImprovementLoopEnabled(): boolean {
  return process.env.COURSE_IMPROVEMENT_LOOP === '1'
}

/** Guarded filesystem — the only write API autonomous runners should use. */
export class GuardedWriter {
  writeFile(targetPath: string, data: string | Buffer, encoding?: BufferEncoding): void {
    const rel = assertWritablePath(targetPath)
    const abs = path.join(process.cwd(), rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, data, encoding ?? 'utf8')
  }

  mkdir(targetPath: string): void {
    const rel = assertWritablePath(targetPath)
    fs.mkdirSync(path.join(process.cwd(), rel), { recursive: true })
  }

  rename(fromPath: string, toPath: string): void {
    assertWritablePath(fromPath)
    assertWritablePath(toPath)
    fs.renameSync(
      path.join(process.cwd(), normalizeProjectRelative(fromPath)),
      path.join(process.cwd(), normalizeProjectRelative(toPath))
    )
  }

  unlink(targetPath: string): void {
    const rel = assertWritablePath(targetPath)
    fs.unlinkSync(path.join(process.cwd(), rel))
  }
}

export function createGuardedWriter(): GuardedWriter {
  return new GuardedWriter()
}
