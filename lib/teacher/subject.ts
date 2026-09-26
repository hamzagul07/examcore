/**
 * Which syllabus a classroom teaches (docs/TEACHER_SYSTEM_SPEC.md §1.1, §2.2).
 *
 * `classrooms.subject_code` is a lib/syllabi registry key ('9709',
 * 'ib-chemistry-hl'). Every v2 analytics read, topic picker and question
 * picker is scoped by it, so a wrong guess is worse than no guess: a
 * Chemistry class resolved to Mathematics would show a teacher confident,
 * empty blindspots for the wrong course. The rule here is therefore to
 * resolve only what is unambiguous and return null otherwise — the class
 * settings page asks the teacher when the code is null.
 *
 * Inputs are the three free-ish text columns classrooms have always had:
 *
 *   Cambridge  board 'Cambridge International', level 'A-Level' | 'AS Level'
 *              | 'O-Level', subject the display name ('Mathematics'). The
 *              same name maps to different codes by level (9709 vs 4024), so
 *              the level decides, and a name that still maps to two codes is
 *              ambiguous.
 *   IB         board 'IB', level 'IB Diploma', subject the IB code itself
 *              ('ib-chemistry-hl'), or on older rows a label ('Chemistry HL').
 *              A bare 'Chemistry' could be HL or SL: ambiguous.
 *   Others     Edexcel / AQA / OxfordAQA / AP subjects have no syllabus tree in
 *              the registry, so they resolve to null rather than borrowing a
 *              Cambridge code with the same subject name.
 *
 * Only codes with a syllabus tree are returned, because that tree is what
 * coverage, topic pickers and blindspots are computed over.
 */

import { getSyllabusSubjectCodes } from '@/lib/syllabi'
import { IB_MARKING_PROFILES } from '@/lib/ib/marking-config'
import { IB_BOARD_ID, IB_DIPLOMA_LEVEL, SUBJECTS } from '@/lib/profile-options'

export { displayName, DISPLAY_NAME_FALLBACK } from '@/lib/teacher/display-name'

/** Board ids (normalised) that mean Cambridge International. */
const CAMBRIDGE_BOARDS = new Set(['cambridge international', 'cambridge', 'caie', 'cie'])

/** Level spellings seen in the wild → the ids SUBJECTS uses. */
const CAMBRIDGE_LEVELS: Record<string, string> = {
  'a-level': 'A-Level',
  'a level': 'A-Level',
  alevel: 'A-Level',
  'a2 level': 'A-Level',
  a2: 'A-Level',
  'as level': 'AS Level',
  'as-level': 'AS Level',
  as: 'AS Level',
  'o-level': 'O-Level',
  'o level': 'O-Level',
  olevel: 'O-Level',
}

let registry: ReadonlySet<string> | null = null
function registryCodes(): ReadonlySet<string> {
  registry ??= new Set(getSyllabusSubjectCodes())
  return registry
}

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** The one registry code in `codes`, or null for none / several / unregistered. */
function single(codes: Iterable<string>): string | null {
  const distinct = new Set(codes)
  if (distinct.size !== 1) return null
  const [code] = distinct
  return registryCodes().has(code) ? code : null
}

function resolveIb(subject: string): string | null {
  const s = norm(subject)
  if (s.startsWith('ib-')) return registryCodes().has(s) ? s : null

  // 'Chemistry HL' → the profile whose label is exactly that; 'Theory of
  // Knowledge' → the one profile with that name. 'Chemistry' alone names two.
  const byLabel = IB_MARKING_PROFILES.filter(
    (p) => norm(p.level === 'Core' ? p.name : `${p.name} ${p.level}`) === s
  )
  if (byLabel.length) return single(byLabel.map((p) => p.code))
  return single(IB_MARKING_PROFILES.filter((p) => norm(p.name) === s).map((p) => p.code))
}

function resolveCambridge(level: string, subject: string): string | null {
  const s = norm(subject)
  // A bare Cambridge syllabus code is the most specific thing a row can say.
  if (/^\d{4}$/.test(s)) return registryCodes().has(s) ? s : null

  const levelId = CAMBRIDGE_LEVELS[level] ?? null
  // A level we do not recognise (IGCSE has no entries yet) must not fall
  // through to "any level", or IGCSE Mathematics would become 9709.
  if (level && !levelId) return null

  const candidates = SUBJECTS.filter(
    (o) =>
      (norm(o.id) === s || norm(o.label) === s) &&
      (levelId === null || o.levels.includes(levelId))
  )
  return single(candidates.map((o) => o.code))
}

/**
 * The syllabus registry key for a classroom's board / level / subject, or
 * null when it cannot be determined without guessing.
 */
export function resolveClassroomSubjectCode(board: string, level: string, subject: string): string | null {
  const b = norm(board)
  const l = norm(level)
  const s = norm(subject)
  if (!s) return null

  // The classrooms columns default to 'Cambridge International' / 'A-Level',
  // and POST /api/teacher/classrooms fills those defaults in for any field a
  // client omits. So an IB class created without a board reads "Cambridge,
  // A-Level, ib-physics-sl". An IB code names exactly one course, so it wins
  // over a default-looking board — but not over a board that was clearly
  // chosen (an Edexcel class naming an IB code contradicts itself).
  const cambridgeOrDefault = !b || CAMBRIDGE_BOARDS.has(b)
  if (s.startsWith('ib-')) {
    return b === norm(IB_BOARD_ID) || cambridgeOrDefault ? resolveIb(s) : null
  }

  // An IB board, or the IB level on a board that may just be the default.
  if (b === norm(IB_BOARD_ID) || (l === norm(IB_DIPLOMA_LEVEL) && cambridgeOrDefault)) {
    return resolveIb(s)
  }
  if (!cambridgeOrDefault) return null
  return resolveCambridge(l, s)
}
