/**
 * Per-component marking style map — derived from investigation of real mark
 * scheme PDFs (see lib/marking/investigation-report.json) plus Cambridge
 * syllabus conventions. Paper-level defaults apply when no override exists.
 */

import type { MarkingStyle } from './types'

export type ComponentMarkingMeta = {
  style: MarkingStyle
  label: string
}

function paperFromComponent(component: string): number {
  const n = parseInt(component, 10)
  if (Number.isNaN(n)) return 0
  return n >= 10 ? Math.floor(n / 10) : n
}

/** Subject-level default when component not explicitly mapped */
const SUBJECT_DEFAULT: Record<string, MarkingStyle> = {
  '9709': 'point_based',
  '9231': 'point_based',
  '4024': 'point_based',
  '4037': 'point_based',
  '9700': 'point_based',
  '9701': 'point_based',
  '9702': 'point_based',
  '5090': 'point_based',
  '5070': 'point_based',
  '5054': 'point_based',
  '9706': 'point_based',
  '7707': 'point_based',
  '9618': 'point_based',
  '2210': 'point_based',
  '9708': 'mixed',
  '2281': 'mixed',
  '9609': 'mixed',
  '7115': 'mixed',
  '9990': 'mixed',
  '9084': 'level_of_response',
  '9488': 'level_of_response',
  '9489': 'level_of_response',
  '9699': 'level_of_response',
  '9607': 'level_of_response',
}

/**
 * Explicit overrides from PDF investigation + syllabus docs.
 * Key: `${subjectCode}/${component}`
 */
const COMPONENT_OVERRIDES: Record<string, MarkingStyle> = {
  // Sciences — Paper 1 is MCQ across Bio/Chem/Phys
  '9700/11': 'mcq', '9700/12': 'mcq', '9700/13': 'mcq', '9700/14': 'mcq',
  '9701/11': 'mcq', '9701/12': 'mcq', '9701/13': 'mcq', '9701/14': 'mcq',
  '9702/11': 'mcq', '9702/12': 'mcq', '9702/13': 'mcq', '9702/14': 'mcq',

  // Law 9084 — P1 source-based (mixed short + LOR), P2-4 essays
  '9084/11': 'mixed', '9084/12': 'mixed', '9084/13': 'mixed',
  '9084/21': 'level_of_response', '9084/22': 'level_of_response', '9084/23': 'level_of_response',
  '9084/31': 'level_of_response', '9084/32': 'level_of_response', '9084/33': 'level_of_response',
  '9084/41': 'level_of_response', '9084/42': 'level_of_response', '9084/43': 'level_of_response',

  // Islamic Studies 9488 — source analysis + essays
  '9488/12': 'mixed', '9488/22': 'level_of_response',
  '9488/32': 'level_of_response', '9488/42': 'level_of_response',

  // History 9489 — all essay LOR (confirmed in investigation)
  '9489/11': 'level_of_response', '9489/12': 'level_of_response', '9489/13': 'level_of_response',
  '9489/21': 'level_of_response', '9489/22': 'level_of_response', '9489/23': 'level_of_response',
  '9489/31': 'level_of_response', '9489/32': 'level_of_response', '9489/33': 'level_of_response',
  '9489/41': 'level_of_response', '9489/42': 'level_of_response', '9489/43': 'level_of_response',

  // Sociology 9699 — P1 MCQ/short, P2-4 essays
  '9699/11': 'mixed', '9699/12': 'mixed', '9699/13': 'mixed',
  '9699/21': 'level_of_response', '9699/22': 'level_of_response', '9699/23': 'level_of_response',
  '9699/31': 'level_of_response', '9699/32': 'level_of_response', '9699/33': 'level_of_response',
  '9699/41': 'level_of_response', '9699/42': 'level_of_response', '9699/43': 'level_of_response',

  // Economics 9708
  '9708/11': 'mixed', '9708/12': 'mixed', '9708/13': 'mixed',
  '9708/21': 'point_based', '9708/22': 'point_based', '9708/23': 'point_based',
  '9708/31': 'level_of_response', '9708/32': 'level_of_response', '9708/33': 'level_of_response',
  '9708/41': 'level_of_response', '9708/42': 'level_of_response', '9708/43': 'level_of_response',

  // Business 9609
  '9609/11': 'mixed', '9609/12': 'mixed', '9609/13': 'mixed',
  '9609/21': 'point_based', '9609/22': 'point_based', '9609/23': 'point_based',
  '9609/31': 'mixed', '9609/32': 'mixed', '9609/33': 'mixed',
  '9609/41': 'level_of_response', '9609/42': 'level_of_response', '9609/43': 'level_of_response',

  // Psychology 9990
  '9990/11': 'mixed', '9990/12': 'mixed', '9990/13': 'mixed',
  '9990/21': 'point_based', '9990/22': 'point_based', '9990/23': 'point_based',
  '9990/31': 'mixed', '9990/32': 'mixed', '9990/33': 'mixed',
  '9990/41': 'level_of_response', '9990/42': 'level_of_response', '9990/43': 'level_of_response',

  // Media 9607
  '9607/21': 'level_of_response', '9607/22': 'level_of_response', '9607/23': 'level_of_response',
  '9607/41': 'level_of_response', '9607/42': 'level_of_response', '9607/43': 'level_of_response',
}

/** Heuristic fallback using paper number within a subject */
function heuristicStyle(subjectCode: string, component: string): MarkingStyle {
  const paper = paperFromComponent(component)
  const subjectDefault = SUBJECT_DEFAULT[subjectCode] ?? 'point_based'

  if (['9700', '9701', '9702', '5090', '5070', '5054'].includes(subjectCode) && paper === 1) {
    return 'mcq'
  }
  if (['9709', '9231', '4024', '4037', '9706', '7707', '9618', '2210'].includes(subjectCode)) {
    return 'point_based'
  }
  if (['9489', '9084', '9488', '9607'].includes(subjectCode)) {
    return paper === 1 ? 'mixed' : 'level_of_response'
  }
  if (['9699', '9708', '9609', '9990', '2281', '7115'].includes(subjectCode)) {
    if (paper === 1) return 'mixed'
    if (paper === 2 && subjectCode !== '9699') return 'point_based'
    if (paper === 2 && subjectCode === '9699') return 'level_of_response'
    if (paper === 3 && ['9609', '9990'].includes(subjectCode)) return 'mixed'
    return 'level_of_response'
  }
  return subjectDefault
}

export function getComponentMarkingType(
  subjectCode: string,
  component: string
): MarkingStyle {
  const key = `${subjectCode}/${component}`
  if (COMPONENT_OVERRIDES[key]) return COMPONENT_OVERRIDES[key]
  return heuristicStyle(subjectCode, component)
}

export function getComponentMarkingMeta(
  subjectCode: string,
  component: string
): ComponentMarkingMeta {
  const style = getComponentMarkingType(subjectCode, component)
  const labels: Record<MarkingStyle, string> = {
    mcq: 'Multiple choice',
    point_based: 'Point-based marking',
    level_of_response: 'Level-of-response (essay)',
    mixed: 'Mixed marking styles',
  }
  return { style, label: labels[style] }
}

export function parsePaperCode(paperCode: string): {
  subjectCode: string
  component: string
} | null {
  const [subjectCode, component] = paperCode.split('/')
  if (!subjectCode || !component) return null
  return { subjectCode, component }
}

export function resolveMarkingTypeForPaper(paperCode: string): MarkingStyle {
  const parsed = parsePaperCode(paperCode)
  if (!parsed) return 'point_based'
  return getComponentMarkingType(parsed.subjectCode, parsed.component)
}

// ─── IB Diploma component → marking-style map ───────────────────────────────
// Keyed `${subjectSlug}/${paperName}` (e.g. "biology-hl/Paper 1"). Used as the
// default hint during IB extraction; per-question marking_type from the scheme
// still wins. IB sciences: Paper 1 = MCQ; Papers 2/3 = mixed short + extended.
const IB_COMPONENT_OVERRIDES: Record<string, MarkingStyle> = {
  'biology-hl/Paper 1': 'mcq',
  'biology-hl/Paper 2': 'mixed',
  'biology-hl/Paper 3': 'mixed',
  'biology-sl/Paper 1': 'mcq',
  'biology-sl/Paper 2': 'mixed',
  'biology-sl/Paper 3': 'mixed',
}

export function getIbComponentMarkingType(slug: string, paper: string): MarkingStyle {
  const key = `${slug}/${paper}`
  if (IB_COMPONENT_OVERRIDES[key]) return IB_COMPONENT_OVERRIDES[key]
  if (/paper\s*1/i.test(paper) && /^(biology|chemistry|physics)-/.test(slug)) return 'mcq'
  if (/^maths-/.test(slug)) return 'point_based'
  return 'mixed'
}
