/**
 * Heuristic subject inference from question/answer text.
 * Used to validate Claude paper detection and to avoid defaulting to 9709.
 */

/** Cambridge A-Level subject codes supported for marking. */
export const CAMBRIDGE_SUBJECT_CODES = [
  '9084',
  '9231',
  '9488',
  '9489',
  '9607',
  '9609',
  '9618',
  '9699',
  '9700',
  '9701',
  '9702',
  '9706',
  '9708',
  '9709',
  '9990',
] as const

export type CambridgeSubjectCode = (typeof CAMBRIDGE_SUBJECT_CODES)[number]

type SubjectRule = {
  code: CambridgeSubjectCode
  /** Whole-word or phrase patterns (case-insensitive). */
  patterns: RegExp[]
  weight?: number
}

const RULES: SubjectRule[] = [
  {
    code: '9701',
    weight: 2,
    patterns: [
      /\bionic\s+radius\b/i,
      /\bcovalent\b/i,
      /\belectronegativity\b/i,
      /\bmol(?:e|ar)\b/i,
      /\b(?:H2O|NaCl|Mg\^?\{?2\+|Al\^?\{?3\+|Fe\^?\{?2\+|Fe\^?\{?3\+)\b/i,
      /\bpH\b/i,
      /\boxid(?:ation|ise|ize)\b/i,
      /\bredox\b/i,
      /\bequilibrium\s+constant\b/i,
      /\borganic\s+chemistry\b/i,
      /\bperiodic\s+table\b/i,
      /\balloy\b/i,
      /\bintermolecular\b/i,
    ],
  },
  {
    code: '9700',
    patterns: [
      /\b(?:DNA|RNA|mRNA)\b/i,
      /\bphotosynthesis\b/i,
      /\bmitosis\b/i,
      /\bmeiosis\b/i,
      /\bcell\s+membrane\b/i,
      /\benzyme\b/i,
      /\borganism\b/i,
      /\bchloroplast\b/i,
      /\ballele\b/i,
      /\btranscription\b/i,
    ],
  },
  {
    code: '9702',
    patterns: [
      /\bresultant\s+force\b/i,
      /\bacceleration\b/i,
      /\bvelocity\b/i,
      /\bcircuit\b/i,
      /\bwavelength\b/i,
      /\bF\s*=\s*ma\b/i,
      /\bnewton\b/i,
      /\bjoule\b/i,
      /\b(?:m\/s|N\s*m|kg\s*m)\b/i,
      /\belectric\s+field\b/i,
      /\bmomentum\b/i,
    ],
  },
  {
    code: '9709',
    patterns: [
      /\bintegrat(?:e|ion)\b/i,
      /\bdifferentiat(?:e|ion)\b/i,
      /\bbinomial\s+expansion\b/i,
      /\bquadratic\b/i,
      /\btrigonometric\s+identit/i,
      /\b(?:dy\/dx|d²y\/dx²)\b/i,
      /\bfind\s+the\s+value\s+of\s+x\b/i,
      /\bx\^2\s*[-+]\s*\d+x/i,
      /\bcoefficient\s+of\s+x\^?\d/i,
      /\b(?:sin|cos|tan)\s*\(/i,
      /\bvector\s+geometry\b/i,
    ],
  },
  {
    code: '9231',
    patterns: [
      /\bfurther\s+mathematics\b/i,
      /\bcomplex\s+number\b/i,
      /\bmatrices\b/i,
      /\beigenvalue\b/i,
    ],
  },
  {
    code: '9489',
    patterns: [
      /\bto\s+what\s+extent\b/i,
      /\bexplain\s+the\s+causes\s+of\b/i,
      /\b(?:19|20)\d{2}\b.*\b(?:war|revolution|treaty)\b/i,
      /\bcold\s+war\b/i,
      /\bstalin\b/i,
      /\bhitler\b/i,
    ],
  },
  {
    code: '9084',
    patterns: [/\b(?:negligence|tort|contract\s+law|statute|precedent)\b/i],
  },
  {
    code: '9488',
    patterns: [/\bislamic\s+studies\b/i, /\bqur(?:an|'an)\b/i, /\bhadith\b/i],
  },
  {
    code: '9607',
    patterns: [/\bmedia\s+studies\b/i, /\brepresentation\b/i, /\baudience\b/i],
  },
  {
    code: '9609',
    patterns: [/\bbusiness\s+studies\b/i, /\bmarketing\s+mix\b/i, /\bstakeholder\b/i],
  },
  {
    code: '9618',
    patterns: [
      /\b(?:algorithm|pseudocode|binary\s+tree|stack|queue)\b/i,
      /\bcomputer\s+science\b/i,
    ],
  },
  {
    code: '9699',
    patterns: [/\bsociology\b/i, /\bsocialisation\b/i, /\bfunctionalist\b/i],
  },
  {
    code: '9706',
    patterns: [/\baccounting\b/i, /\bdebit\b/i, /\bcredit\b/i, /\bbalance\s+sheet\b/i],
  },
  {
    code: '9708',
    patterns: [
      /\beconomics\b/i,
      /\b(?:demand|supply)\s+curve\b/i,
      /\bGDP\b/i,
      /\binflation\b/i,
      /\belasticity\b/i,
    ],
  },
  {
    code: '9990',
    patterns: [
      /\bpsychology\b/i,
      /\bcognitive\s+psychology\b/i,
      /\boperant\s+conditioning\b/i,
    ],
  },
]

function scoreSubject(text: string, rule: SubjectRule): number {
  let score = 0
  for (const re of rule.patterns) {
    if (re.test(text)) score += rule.weight ?? 1
  }
  return score
}

/**
 * Infer the most likely Cambridge subject code from question/answer prose.
 * Returns null when no subject-specific signals are found.
 */
export function inferSubjectFromQuestionText(
  text: string | null | undefined
): CambridgeSubjectCode | null {
  const normalized = (text || '').trim()
  if (normalized.length < 8) return null

  let best: { code: CambridgeSubjectCode; score: number } | null = null
  for (const rule of RULES) {
    const score = scoreSubject(normalized, rule)
    if (score === 0) continue
    if (!best || score > best.score) {
      best = { code: rule.code, score }
    }
  }
  return best?.score ? best.code : null
}

export function subjectCodeFromPaperCode(
  paperCode: string | null | undefined
): string | null {
  if (!paperCode || typeof paperCode !== 'string') return null
  const code = paperCode.split('/')[0]?.trim()
  if (!code || !CAMBRIDGE_SUBJECT_CODES.includes(code as CambridgeSubjectCode)) {
    return null
  }
  return code
}

/**
 * If question content clearly belongs to one subject but detection picked another,
 * downgrade past-paper detection so marking uses the correct subject syllabus.
 */
export function reconcileDetectionWithQuestion(
  detection: Record<string, unknown>,
  questionText: string
): Record<string, unknown> {
  const inferred = inferSubjectFromQuestionText(questionText)
  if (!inferred) return detection

  const detectedSubject = subjectCodeFromPaperCode(
    typeof detection.paper_code === 'string' ? detection.paper_code : null
  )
  if (!detection.is_past_paper || !detectedSubject || detectedSubject === inferred) {
    return detection
  }

  return {
    ...detection,
    is_past_paper: false,
    paper_code: null,
    paper_session: null,
    question_number: null,
    confidence: 'low',
    reasoning: `Question content indicates subject ${inferred} but detected paper headers suggested ${detectedSubject}. Not using past-paper match.`,
  }
}
