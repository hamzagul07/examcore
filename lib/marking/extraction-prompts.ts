import type { MarkingStyle } from './types'

export function buildExtractionPrompt(markingType: MarkingStyle): string {
  const base = `You are extracting Cambridge International A-Level mark schemes from official PDFs. You have been given:
- The QUESTION PAPER (first PDF) — contains the actual problem statements
- The MARK SCHEME (second PDF) — contains the marking criteria

For every question and sub-part in this paper (including 1, 2(a), 2(b), 3(a)(i), etc.), cross-reference both PDFs to extract:

1. question_number — exactly as printed, e.g. "1", "2(a)", "3(b)(i)" (use lowercase letters and roman numerals)
2. question_text — the full problem statement from the question paper
3. total_marks — sum of marks for this question/sub-part from the mark scheme
4. marking_type — one of: mcq, point_based, level_of_response, mixed (for this specific question)
5. mark_scheme — structured JSON appropriate to the marking type (see below)

Be thorough. Extract EVERY question, every sub-part. Don't skip any.

Output ONLY this JSON (no markdown):
{
  "paper_marking_type": "${markingType}",
  "questions": [ ... ]
}`

  const schemas: Record<MarkingStyle, string> = {
    mcq: `
For MCQ papers, mark_scheme structure:
{
  "type": "mcq",
  "answer_key": { "1": "C", "2": "B", "3": "A" },
  "notes": "any examiner notes"
}
Extract the complete answer key for ALL questions.`,

    point_based: `
For point-based papers, mark_scheme structure:
{
  "type": "point_based",
  "marks": [
    {
      "id": 1,
      "type": "B1",
      "value": 1,
      "description": "Brief description of what earns this mark",
      "ecf_from": null,
      "acceptable_forms": ["alternative correct expressions"]
    }
  ],
  "acceptable_final_answers": ["3", "3.0"],
  "common_errors": ["What students commonly get wrong"],
  "notes": "Examiner notes if any"
}
Mark types: B1, M1, A1, B2, M2, A2, DM1, C1 etc. (B = independent, M = method, A = accuracy, C = comprehension)`,

    level_of_response: `
For level-of-response (essay) questions, mark_scheme structure:
{
  "type": "level_of_response",
  "assessment_objectives": ["AO1: Knowledge", "AO2: Analysis"],
  "bands": [
    {
      "level": 4,
      "marks_min": 13,
      "marks_max": 16,
      "descriptor": "Full verbatim band descriptor from mark scheme"
    }
  ],
  "indicative_content": ["Key points students may mention"],
  "notes": "Examiner notes, 'answers must include...' etc."
}
Extract ALL band levels with exact mark ranges and descriptors.`,

    mixed: `
For mixed papers, each question may differ. mark_scheme structure:
{
  "type": "mixed",
  "question_style": "mcq" | "point_based" | "level_of_response",
  ... include the appropriate sub-structure for that question's style ...
}`,
  }

  return `${base}\n${schemas[markingType]}`
}

export function buildTargetedExtractionPrompt(
  markingType: MarkingStyle,
  targetQuestion: string
): string {
  const q = targetQuestion.trim()
  const base = `You are extracting Cambridge International A-Level mark schemes from official PDFs. You have been given:
- The QUESTION PAPER (first PDF) — contains the actual problem statements
- The MARK SCHEME (second PDF) — contains the marking criteria

Extract ONLY question "${q}" and its sub-parts if applicable (e.g. if asked for "2", include 2(a), 2(b) only when they are parts of question 2; if asked for "2(a)", extract only that sub-part).

Skip every other question on the paper. Do not summarize or list other questions.

For the targeted question(s), cross-reference both PDFs to extract:

1. question_number — exactly as printed, e.g. "1", "2(a)", "3(b)(i)" (use lowercase letters and roman numerals)
2. question_text — the full problem statement from the question paper
3. total_marks — sum of marks for this question/sub-part from the mark scheme
4. marking_type — one of: mcq, point_based, level_of_response, mixed (for this specific question)
5. mark_scheme — structured JSON appropriate to the marking type (see below)

Output ONLY this JSON (no markdown):
{
  "paper_marking_type": "${markingType}",
  "questions": [ ... ]
}`

  const schemas: Record<MarkingStyle, string> = {
    mcq: `
For MCQ, mark_scheme structure:
{
  "type": "mcq",
  "answer_key": { "1": "C", "2": "B" },
  "notes": "any examiner notes"
}
Include only entries for the targeted question(s).`,

    point_based: `
For point-based, mark_scheme structure:
{
  "type": "point_based",
  "marks": [
    {
      "id": 1,
      "type": "B1",
      "value": 1,
      "description": "Brief description of what earns this mark",
      "ecf_from": null,
      "acceptable_forms": ["alternative correct expressions"]
    }
  ],
  "acceptable_final_answers": ["3", "3.0"],
  "common_errors": [],
  "notes": ""
}
Mark types: B1, M1, A1, etc.`,

    level_of_response: `
For level-of-response, mark_scheme structure:
{
  "type": "level_of_response",
  "assessment_objectives": ["AO1: Knowledge"],
  "bands": [
    {
      "level": 4,
      "marks_min": 13,
      "marks_max": 16,
      "descriptor": "Full verbatim band descriptor from mark scheme"
    }
  ],
  "indicative_content": [],
  "notes": ""
}`,

    mixed: `
For mixed papers, mark_scheme structure:
{
  "type": "mixed",
  "question_style": "mcq" | "point_based" | "level_of_response",
  ... appropriate sub-structure for that question's style ...
}`,
  }

  return `${base}\n${schemas[markingType]}`
}

export function validateExtractedQuestion(
  q: Record<string, unknown>,
  paperMarkingType: MarkingStyle
): boolean {
  if (typeof q.question_number !== 'string' || !q.question_number.trim()) {
    return false
  }
  const totalMarks =
    typeof q.total_marks === 'number' ? q.total_marks : Number(q.total_marks)
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return false

  const ms = q.mark_scheme as Record<string, unknown> | undefined
  if (!ms || typeof ms !== 'object') return false

  const qType = (ms.type as string) || paperMarkingType

  if (qType === 'mcq') {
    const key = ms.answer_key
    return !!(key && typeof key === 'object' && Object.keys(key as object).length > 0)
  }
  if (qType === 'level_of_response') {
    const bands = ms.bands
    return Array.isArray(bands) && bands.length > 0
  }
  if (qType === 'point_based') {
    const marks = ms.marks
    return Array.isArray(marks) && marks.length > 0
  }
  // mixed — accept if any valid sub-structure
  return true
}

export function questionMarkingType(
  q: Record<string, unknown>,
  paperMarkingType: MarkingStyle
): MarkingStyle {
  const ms = q.mark_scheme as Record<string, unknown> | undefined
  const qStyle = ms?.type ?? q.marking_type
  if (
    qStyle === 'mcq' ||
    qStyle === 'point_based' ||
    qStyle === 'level_of_response' ||
    qStyle === 'mixed'
  ) {
    return qStyle
  }
  if (paperMarkingType === 'mixed' && ms?.question_style) {
    const s = ms.question_style
    if (s === 'mcq' || s === 'point_based' || s === 'level_of_response') {
      return s
    }
  }
  return paperMarkingType === 'mixed' ? 'point_based' : paperMarkingType
}
