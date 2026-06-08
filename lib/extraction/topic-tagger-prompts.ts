import type { SyllabusObjective } from './types'

export type TaggingQuestionContext = {
  subjectCode: string
  paperNumber: string
  variant: string
  year: number
  session: string
  paperKind?: string
}

export function formatObjectiveList(objectives: SyllabusObjective[]): string {
  return objectives
    .map((o) => {
      const papers =
        o.examined_in_papers?.length ? o.examined_in_papers.join(', ') : '—'
      return `${o.objective_number} | ${o.objective_text} | papers: ${papers}`
    })
    .join('\n')
}

export type BatchTaggingQuestionInput = {
  index: number
  questionText: string
  marks: number | null
  context: TaggingQuestionContext
}

export function buildBatchTopicTaggingPrompt(
  questions: BatchTaggingQuestionInput[],
  objectives: SyllabusObjective[]
): string {
  const questionBlock = questions
    .map((q) => {
      const paperLine = [
        `paper=${q.context.paperNumber}`,
        `variant=${q.context.variant}`,
        q.context.paperKind ? `kind=${q.context.paperKind}` : null,
        `${q.context.session} ${q.context.year}`,
      ]
        .filter(Boolean)
        .join(' ')
      const marksLine = q.marks != null ? `${q.marks} marks` : 'marks not stated'
      return `[${q.index}] ${paperLine} ${marksLine}\ntext=${q.questionText.trim()}`
    })
    .join('\n\n')

  return `You are tagging Cambridge past paper questions against syllabus objectives.

SYLLABUS OBJECTIVES (full list for this subject):
${formatObjectiveList(objectives)}

QUESTIONS TO TAG:
${questionBlock}

Return JSON array with one entry per question in order:
[
  { "question_index": 1, "tags": [{"objective_number": "14.3.1", "confidence": 0.92}] },
  { "question_index": 2, "tags": [...] }
]

RULES:
- objective_number MUST be copied exactly from the syllabus list above.
- Return 1–3 tags per question, ordered by confidence descending.
- Use the full confidence range honestly (do not default everything to 0.95).
- Return ONLY valid JSON array, no markdown.`
}

export function buildTopicTaggingPrompt(
  questionText: string,
  marks: number | null,
  context: TaggingQuestionContext,
  objectives: SyllabusObjective[]
): string {
  const paperLine = [
    `Subject ${context.subjectCode}`,
    `Paper ${context.paperNumber}`,
    `Variant ${context.variant}`,
    context.paperKind ? `(${context.paperKind})` : null,
    `${context.session} ${context.year}`,
  ]
    .filter(Boolean)
    .join(', ')

  const marksLine =
    marks != null ? `${marks} mark${marks === 1 ? '' : 's'}` : 'marks not stated'

  const paperHint =
    context.paperNumber === '3'
      ? `This question is from a Cambridge Practical paper (Paper 3). Paper 3 primarily examines topic 1.3 (Errors and uncertainties / experimental skills).

PAPER 3 TAGGING RULES (topic 1.3 has only three objectives — pick the best fit):
- 1.3.1: systematic/random errors, reliability, experimental improvements, limitations, zero errors, justifying apparatus/method choices
- 1.3.2: precision vs accuracy, significant figures justification when tied to measurement quality
- 1.3.3: ONLY when the student must combine or propagate absolute/percentage uncertainties in a derived quantity

When a part is mainly graphing, tabulating, measuring, calculating a constant from a formula, or applying physics theory to the experiment setup, tag the relevant physics syllabus objective as PRIMARY and add a 1.3.x tag as secondary only if uncertainty/error analysis is explicitly required.

Do NOT use 1.3.3 for plotting graphs, drawing lines of best fit, or calculating two values of a constant from a relationship — those test data-handling or subject content, not uncertainty propagation.`
      : context.paperNumber === '5'
        ? `PAPER TYPE: Planning, Analysis & Evaluation — tag experimental design, graphing, logarithmic analysis, evaluation of method/limitations. Prefer planning-related objectives over unrelated theory.`
        : context.paperKind === 'mcq'
          ? `PAPER TYPE: Multiple choice — tag the single concept being tested by the stem, not distractors.`
          : ''

  return `You are tagging Cambridge International A Level past-paper questions against the official syllabus objectives.

PAPER CONTEXT:
${paperLine}
${paperHint ? `\n${paperHint}` : ''}

QUESTION (${marksLine}):
${questionText.trim()}

SYLLABUS OBJECTIVES (${objectives.length} numbered points — use objective_number exactly as shown):
${formatObjectiveList(objectives)}

TASK:
Which syllabus objective(s) does this question PRIMARILY test? A question may span multiple topics, but only tag objectives that are central to what the student must demonstrate.

RULES:
- Return 1–3 objectives, ordered by confidence descending (highest first).
- objective_number MUST be copied exactly from the list above (e.g. "14.3.1"). Do NOT invent numbers.
- Prefer objectives whose examined_in_papers includes this paper (${context.paperNumber}) when equally applicable.
- confidence is 0.0–1.0: how strongly the question tests that objective.
- CONFIDENCE CALIBRATION — use the full range honestly; do NOT default every tag to 0.95 or 1.0:
  • 0.95–1.0: direct, unambiguous match
  • 0.75–0.90: strong match but the question also involves other skills
  • 0.60–0.74: plausible but could reasonably fit another objective
  • below 0.60: weak/speculative — only as a secondary tag if still relevant
- If the question is too vague to tag, return an empty tags array.

Return ONLY valid JSON:
{
  "tags": [
    { "objective_number": "1.1.1", "confidence": 0.92 },
    { "objective_number": "2.3.4", "confidence": 0.71 }
  ]
}`
}

export type AuditTagRow = {
  objective_number: string
  objective_text: string
  confidence: number
}

export function buildTagAuditPrompt(
  questionText: string,
  marks: number | null,
  context: TaggingQuestionContext,
  tags: AuditTagRow[]
): string {
  const tagBlock = tags
    .map(
      (t) =>
        `- ${t.objective_number}: "${t.objective_text}" (tagger confidence ${t.confidence.toFixed(2)})`
    )
    .join('\n')

  const singleTag = tags.length === 1

  const paperAuditHint =
    context.paperNumber === '3'
      ? `\nPAPER 3 NOTE: Accept 1.3.1 for tables, improvements, limitations, and repeat readings. Accept 19.3.1 for capacitor discharge graphing (including 1/T vs V plots). Accept 1.3.3 only for percentage/absolute uncertainty calculations. Accept 10.1.2 for circuit assembly.`
      : context.paperNumber === '4'
        ? `\nPAPER 4 NOTE: Using Hubble constant $H_0$ to find distance ($d = v/H_0$ or $v = H_0 d$) is objective 25.3.4 (Hubble's law). Accept 25.3.4 as correct for such calculations. Labelling acceleration direction on a diagram is 2.1.1, not circular motion (12.2).`
        : context.paperNumber === '5'
          ? `\nPAPER 5 NOTE: Accept 1.3.3 for log-graph calculations that include absolute uncertainties. Accept 2.1.4/2.1.5 for gradient/y-intercept of lg-log graphs. Accept 6.1.4 for spring constant planning experiments.`
          : ''

  return `You are auditing syllabus tags on a Cambridge A Level past-paper question.

PAPER: ${context.subjectCode} Paper ${context.paperNumber}, ${context.session} ${context.year}
MARKS: ${marks ?? 'unknown'}${paperAuditHint}

QUESTION:
${questionText.trim()}

PROPOSED TAGS (primary objective first, ${tags.length} tag${tags.length === 1 ? '' : 's'}):
${tagBlock}

Evaluate:
1. PRIMARY TAG — does the first tag correctly describe what this question mainly tests?
2. SECONDARY TAGS — if there are 2–3 tags, are the additional tags (after the first) also reasonable?
${singleTag ? 'There is only ONE tag. If the primary tag is correct, secondary_tags_correct MUST be true.' : ''}

Return ONLY valid JSON:
{
  "primary_tag_correct": true,
  "secondary_tags_correct": true,
  "reason": "one non-empty sentence explaining your verdict"
}

Rules:
- primary_tag_correct=false if the main tagged objective is wrong or too broad/narrow.
- secondary_tags_correct=true when there are no secondary tags (only 1 tag total) OR every secondary tag is reasonable.
- secondary_tags_correct=false only if a 2nd or 3rd tag is clearly wrong.
- reason MUST be a non-empty string.`
}

export function buildJsonRepairPrompt(basePrompt: string, rawResponse: string): string {
  return `A topic-tagging model was given this prompt:

${basePrompt}

It replied with invalid or incomplete JSON:

---
${rawResponse.slice(0, 4000)}
---

Repair the reply into valid JSON matching this schema exactly:
{"tags":[{"objective_number":"<from syllabus list>","confidence":0.0-1.0}]}

Use only objective_number values that appeared in the original syllabus list in the prompt.
Return ONLY the JSON object, no markdown or explanation.`
}

/** Synthetic multi-topic question for confidence calibration checks. */
export const AMBIGUOUS_CALIBRATION_QUESTION = {
  question_text: `A particle of mass $m$ and charge $q$ enters a uniform magnetic field of flux density $B$ with speed $v$ perpendicular to the field.

Calculate:
(a) the radius of the circular path,
(b) the momentum of the particle,
(c) the kinetic energy gained if the particle is accelerated through a potential difference $V$ before entering the field.`,
  marks: 6,
  subject_code: '9702',
  paper_number: '4',
  variant: '42',
  year: 2024,
  session: 'May/June',
  paper_kind: 'structured',
} as const
