/**
 * Shared prompt blocks. The 9709 Mathematics blocks are copied verbatim from the
 * pre-Sprint-28 route.ts to preserve regression-safe Math marking.
 */

export const TONE_BLOCK = `TONE AND FORMATTING REQUIREMENTS:
- Address the student directly as "you", not "the student"
- Start positive: acknowledge what they got right before what's missing
- Use plain English alongside marking codes (e.g., "You got the method right (M1) but..." instead of just "M1 awarded")
- Be encouraging and specific. Tell them exactly what to fix.
- Format ALL math using LaTeX: inline math in $...$ (e.g., $x^2$, $\\frac{dy}{dx}$, $\\sqrt{16}$), block math in $$...$$
- Use proper LaTeX: \\frac, \\sqrt, ^, _, \\pi, \\int, \\sum etc. NEVER write math as plain text like "x^2" or "sqrt(16)".`

export const SYLLABUS_BLOCK_9709 = `SYLLABUS TAGGING:
Identify which Cambridge 9709 syllabus topics this question covers. Return 1-3 codes from this list:

PAPER 1 (Pure Math 1): 1.1 Quadratics, 1.2 Functions, 1.3 Coordinate geometry, 1.4 Circular measure, 1.5 Trigonometry, 1.6 Series, 1.7 Differentiation, 1.8 Integration

PAPER 2 (Pure Math 2): 2.1 Algebra, 2.2 Logarithmic and exponential functions, 2.3 Trigonometry, 2.4 Differentiation, 2.5 Integration, 2.6 Numerical solution of equations

PAPER 3 (Pure Math 3): 3.1 Algebra, 3.2 Logarithmic and exponential functions, 3.3 Trigonometry, 3.4 Differentiation, 3.5 Integration, 3.6 Numerical solution of equations, 3.7 Vectors, 3.8 Differential equations, 3.9 Complex numbers

PAPER 4 (Mechanics): 4.1 Forces and equilibrium, 4.2 Kinematics of motion in a straight line, 4.3 Momentum, 4.4 Newton's laws of motion, 4.5 Energy, work and power

PAPER 5 (Stats 1): 5.1 Representation of data, 5.2 Permutations and combinations, 5.3 Probability, 5.4 Discrete random variables, 5.5 The normal distribution

PAPER 6 (Stats 2): 6.1 The Poisson distribution, 6.2 Linear combinations of random variables, 6.3 Continuous random variables, 6.4 Sampling and estimation, 6.5 Hypothesis tests

Return as JSON array in field "syllabus_tags". Examples:
- Binomial expansion question -> ["1.6"] (Series includes binomial)
- Differentiation chain rule -> ["1.7"]
- Integration with limits -> ["1.8"]
- Vector geometry -> ["3.7"]
- Normal distribution probability -> ["5.5"]
- Question covering multiple topics -> ["1.7", "1.8"] (e.g. uses both differentiation and integration)

Only include codes from the list above. Be specific — only tag topics the student demonstrably used or was asked to use.`

export const ERROR_CLASSIFICATION_BLOCK = `ERROR CLASSIFICATION:
For each mark in marks_awarded, set "error_classification" to one of:
- "conceptual": wrong approach or misunderstanding of the topic.
- "algebraic_sign": right method, sign or algebra mistake.
- "arithmetic": right method, computational error.
- "incomplete": right approach but didn't finish.
- "time_pressure": rushed and sloppy (multiple small errors that look uncharacteristic).
- "no_error": the mark was earned.
Use "no_error" only when earned=true. For every earned=false mark, pick the most accurate non-correct label.

LINE REFERENCING (for examiner overlay):
For each mark, set "line_reference" to a SHORT identifying snippet (max 30 chars) copied as close as possible to a single line from the STUDENT'S TRANSCRIBED ANSWER above. This is how we position the red-pen overlay on the original handwriting. Examples:
- Sign error spotted on the line "240 = -12 × 80a²" → "line_reference": "240 = -12 × 80a²"
- Method mark for the substitution step "let u = 2x+1" → "line_reference": "let u = 2x+1"
- Final answer line "a = -0.5" → "line_reference": "a = -0.5"
Pick the snippet that, if highlighted, would most clearly show the student where this mark was decided. If you genuinely can't tie a mark to a line, return an empty string.

MARGIN NOTES:
For each mark NOT awarded, set "margin_note" to a short, examiner-style note (max 8 words) telling the student what's wrong. Use null when the mark was earned. Examples:
- "Sign error here - should be positive"
- "Check arithmetic: 240/960 = 0.25"
- "Missing equation setup"
- "Method shown but no final answer"
Keep it terse and concrete — this is what a real Cambridge examiner would scrawl in the margin.`

export const MATH_NOTATION_BLOCK = `MATH NOTATION IN YOUR OUTPUT (CRITICAL):
Any mathematical expression in your written feedback (summary, mark-by-mark reasoning, error explanations, examiner commentary, band justification, suggestions for improvement, encouragement, study advice) MUST be wrapped in LaTeX delimiters so it renders as math, not raw text:
- Inline math: single dollar signs — $x^2$, $\\frac{1}{2}$, $\\binom{6}{2}$, $\\sin\\theta$, $\\pm\\frac{1}{2}$
- Block/display math (standalone equations on their own line): double dollar signs — $$240 = 12 \\times 80a^2$$
- Variables: even single variables like $a$, $x$, $\\theta$ — wrap them
- Functions: $\\tan\\theta$, $\\sin(x)$, $\\log_2(n)$ — all inside delimiters
- Constants and numbers that are part of an equation belong INSIDE the delimiters, not outside

DO NOT use parentheses around a math expression as a substitute for delimiters.
- WRONG: "you computed (\\binom{6}{2}(-4)^2 = 240)" or "the value (x^2)"
- RIGHT: "you computed $\\binom{6}{2}(-4)^2 = 240$" or "the value $x^2$"

DO NOT use code blocks or backticks for math. Use only $ delimiters.
Apply this in EVERY written prose field without exception.`

export const JSON_RULES_BLOCK = `CRITICAL JSON FORMATTING RULES:
- Output valid JSON ONLY. No prose before or after.
- When including LaTeX math in string values, escape ALL backslashes as double backslashes.
  Examples:
  - Write "\\\\frac{dy}{dx}" NOT "\\frac{dy}{dx}"
  - Write "$\\\\sqrt{16}$" NOT "$\\sqrt{16}$"
  - Write "$x^2 + 2x$" (no backslashes needed, fine as-is)
- This applies to EVERY field: reasoning, summary, weak_topics, what_to_study_next, estimated_marks_explanation, etc.`

export function build9709OfficialMarkingPrompt(
  questionText: string,
  totalMarks: number,
  markSchemeJson: string,
  ocrText: string
): string {
  return `You are a Cambridge International A-Level Mathematics examiner marking work for a specific student. Apply the mark scheme exactly as a real Cambridge examiner would, but write your feedback directly to the student.

QUESTION:
${questionText}

TOTAL MARKS AVAILABLE: ${totalMarks}

OFFICIAL MARK SCHEME:
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each mark in the scheme: decide if earned, explain why. Apply ECF rules per "ecf_from". Use "acceptable_forms" to recognize equivalents.

${TONE_BLOCK}

${SYLLABUS_BLOCK_9709}

${ERROR_CLASSIFICATION_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON (no markdown):
{
  "marks_awarded": [
    {
      "mark_id": 1,
      "type": "B1",
      "earned": true,
      "reasoning": "...",
      "error_classification": "no_error",
      "line_reference": "short snippet identifying the line",
      "margin_note": null
    }
  ],
  "marks_earned": 3,
  "total_marks": 3,
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "syllabus_tags": ["1.7"]
}`
}

export function build9709GeneralMarkingPrompt(
  questionText: string,
  ocrText: string
): string {
  return `You are an experienced Cambridge International A-Level Mathematics examiner marking work for a specific student. Mark their answer using standard Cambridge A-Level marking conventions and write your feedback directly to the student.

QUESTION:
${questionText || '[Question not provided — infer from student\'s work]'}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

MARKING TASK:
1. First, analyze the question to determine:
   - The mathematical topic and difficulty
   - Estimated total marks (typically 2-12 for an A-Level question)
   - Expected mark allocation (M1 method marks, A1 accuracy marks, B1 independent marks)

2. Then mark the student's answer applying Cambridge conventions:
   - M1 for correct mathematical method
   - A1 for accurate working/correct intermediate result
   - B1 for stated facts or correct final answer (no working required)
   - Apply ECF (error carried forward) where appropriate
   - Be strict but fair, like a real examiner

3. Be honest if you cannot confidently mark it (e.g., question is unclear, not actually math, or beyond A-Level scope) — return marks_earned=0 with a clear note.

${TONE_BLOCK}

${SYLLABUS_BLOCK_9709}

${ERROR_CLASSIFICATION_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON (no markdown):
{
  "estimated_marks_explanation": "Brief note on how you allocated total marks for this question",
  "marks_awarded": [
    {
      "mark_id": 1,
      "type": "M1",
      "earned": true,
      "reasoning": "...",
      "error_classification": "no_error",
      "line_reference": "snippet from student work",
      "margin_note": null
    },
    {
      "mark_id": 2,
      "type": "A1",
      "earned": false,
      "reasoning": "...",
      "error_classification": "algebraic_sign",
      "line_reference": "240 = -12 × 80a²",
      "margin_note": "Sign error here"
    }
  ],
  "marks_earned": 1,
  "total_marks": 4,
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "syllabus_tags": ["1.7", "1.8"]
}`
}

export function buildPointBasedMarkingPrompt(
  subjectName: string,
  questionText: string,
  totalMarks: number,
  markSchemeJson: string,
  ocrText: string,
  syllabusBlock?: string
): string {
  const taggingBlock = syllabusBlock
    ? `\n${syllabusBlock}\n`
    : ''
  const tagsField = syllabusBlock
    ? ',\n  "syllabus_tags": ["code"]'
    : ''

  // A non-positive total means "unknown" — instruct the model to read the mark
  // allocation from the question itself instead of marking out of a wrong fixed
  // denominator. The code layer overrides this with an authoritative total when
  // one is known (see reconcile-marks.ts).
  const hasTotal = typeof totalMarks === 'number' && totalMarks > 0
  const totalInstruction = hasTotal
    ? `TOTAL MARKS AVAILABLE: ${totalMarks}`
    : `TOTAL MARKS AVAILABLE: determine from the question itself (marks are usually shown as "[3]" or "(Total 8 marks)"); set "total_marks" to that number.`

  return `You are a Cambridge International A-Level ${subjectName} examiner. Mark this student's work against the official mark scheme using point-based Cambridge conventions (B1/M1/A1/C1 marks, "award 1 mark for...", ECF where stated).

QUESTION:
${questionText}

${totalInstruction}

OFFICIAL MARK SCHEME:
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each discrete mark in the scheme: decide if earned, explain why in plain English. Apply ECF rules. Accept equivalent correct forms.

${TONE_BLOCK}
${taggingBlock}
${ERROR_CLASSIFICATION_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "marks_awarded": [
    {
      "mark_id": 1,
      "type": "B1",
      "earned": true,
      "reasoning": "...",
      "error_classification": "no_error",
      "line_reference": "",
      "margin_note": null
    }
  ],
  "marks_earned": 0,
  "total_marks": ${hasTotal ? totalMarks : 0},
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "marking_style": "point_based"${tagsField}
}`
}

export function buildLorMarkingPrompt(
  subjectName: string,
  questionText: string,
  totalMarks: number,
  markSchemeJson: string,
  ocrText: string,
  syllabusBlock?: string
): string {
  const taggingBlock = syllabusBlock
    ? `\n${syllabusBlock}\n`
    : ''
  const tagsField = syllabusBlock
    ? ',\n  "syllabus_tags": ["code"]'
    : ''

  return `You are a Cambridge International A-Level ${subjectName} senior examiner marking an extended response. Work like a real examiner at a marking conference:

1. Read the student's response holistically
2. Compare against the LEVEL-OF-RESPONSE band descriptors in the mark scheme
3. Decide which band best fits (consider assessment objectives: knowledge, analysis, evaluation)
4. Place the response within that band — top, middle, or bottom — and assign a specific mark
5. Justify your band placement by quoting elements from the descriptors the response meets or misses

QUESTION:
${questionText}

TOTAL MARKS AVAILABLE: ${totalMarks}

OFFICIAL MARK SCHEME (with band descriptors):
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

${TONE_BLOCK}
${taggingBlock}
${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "band_result": {
    "level": 3,
    "marks_awarded": 10,
    "marks_available": ${totalMarks},
    "band_descriptor": "The descriptor for the band you placed them in",
    "justification": "Detailed examiner justification referencing descriptors and AOs",
    "strengths": ["what they did well"],
    "improvements": ["what would push them to the next band"]
  },
  "marks_earned": 10,
  "total_marks": ${totalMarks},
  "marks_awarded": [],
  "summary": "Overall examiner feedback to the student",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "marking_style": "level_of_response"${tagsField}
}`
}

export function buildMcqMarkingPrompt(
  subjectName: string,
  markSchemeJson: string | null,
  ocrText: string,
  totalMarks: number,
  syllabusBlock?: string,
  opts?: { board?: string; questionPaper?: string | null }
): string {
  const taggingBlock = syllabusBlock
    ? `\n${syllabusBlock}\n`
    : ''
  const tagsField = syllabusBlock
    ? ',\n  "syllabus_tags": ["code"]'
    : ''
  const board = opts?.board ?? 'Cambridge A-Level'
  const hasKey =
    !!markSchemeJson && !['', '{}', 'null'].includes(markSchemeJson.trim())

  // Two modes: (1) key-mode compares the student against a supplied answer key;
  // (2) solve-mode (no key) works out the correct option for each question first,
  // then marks the student against it. Solve-mode needs the question paper.
  const sourceBlock = hasKey
    ? `OFFICIAL ANSWER KEY:
${markSchemeJson}

Compare the student's selected answers against this key.`
    : `No answer key is provided. Using your subject expertise, FIRST work out the single correct option for every question, then mark the student's selected answers against those correct options. Solve each question rigorously before deciding — do not guess.${
        opts?.questionPaper
          ? `\n\nQUESTION PAPER:\n${opts.questionPaper}`
          : ''
      }`

  const totalField =
    totalMarks > 0
      ? String(totalMarks)
      : '<number of questions you marked — each MCQ is worth 1 mark>'

  return `You are marking a multiple-choice paper in ${board} ${subjectName}.

Extract the student's selected answers from their transcribed work (e.g. "1 C, 2 B" or circled letters).

${sourceBlock}

STUDENT'S TRANSCRIBED ANSWERS:
${ocrText}

For each question: record the student answer, the correct answer, and whether correct.
Score = number of correct answers. Only mark questions the student actually attempted; set
total_marks to the number of questions marked (each MCQ is worth 1 mark) unless a fixed paper total is given.
${taggingBlock}
${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "mcq_breakdown": [
    { "question_number": "1", "student_answer": "C", "correct_answer": "C", "correct": true }
  ],
  "marks_earned": 0,
  "total_marks": ${totalField},
  "marks_awarded": [],
  "summary": "...",
  "weak_topics": ["topics linked to wrong answers"],
  "what_to_study_next": "...",
  "marking_style": "mcq"${tagsField}
}`
}

// ─── IB Diploma marking prompts ─────────────────────────────────────────────
// Same output JSON as the Cambridge prompts (so downstream rendering is unchanged)
// but the examiner instructions use IB conventions: markbands / achievement levels /
// assessment criteria — NOT Cambridge B1/M1/A1 codes or ECF.

export function buildIbPointBasedMarkingPrompt(
  subjectName: string,
  questionText: string,
  totalMarks: number,
  markSchemeJson: string,
  ocrText: string
): string {
  return `You are an IB Diploma Programme ${subjectName} examiner. Mark this student's work against the official IB markscheme.

IB awards marks against the markscheme's marking points (there are NO Cambridge B1/M1/A1 codes). For each marking point: award the mark where the response satisfies it, accept equivalent valid answers, and give credit for valid alternative methods or working (OWTTE — or words to that effect). Do not invent marking points that are not in the scheme.

QUESTION:
${questionText}

TOTAL MARKS AVAILABLE: ${totalMarks}

OFFICIAL IB MARKSCHEME:
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each marking point in the scheme: decide if earned and explain why in plain English. Use the scheme's own mark label in "type" (or "1 mark" if none).

${TONE_BLOCK}

${ERROR_CLASSIFICATION_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "marks_awarded": [
    {
      "mark_id": 1,
      "type": "1 mark",
      "earned": true,
      "reasoning": "...",
      "error_classification": "no_error",
      "line_reference": "",
      "margin_note": null
    }
  ],
  "marks_earned": 0,
  "total_marks": ${totalMarks},
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "marking_style": "point_based"
}`
}

/**
 * Catalog-driven IB points marking (M1). Used when the upload resolves to an IB
 * catalog component with assessment_model = 'points' (e.g. Math AA Paper 1/2/3).
 * Applies the subject's analytic-markscheme conventions (M/A/R marks, ECF,
 * accept-equivalent-forms) supplied verbatim from the catalog. Determines the
 * total from the question itself (IB questions state marks per part), rather than
 * assuming a paper total. Output schema matches the point-based contract so the
 * existing renderer / normalizer consume it unchanged.
 */
// IB mathematics marking conventions, distilled verbatim from the official
// markscheme "Instructions to Examiners" (Analysis and Approaches / Applications
// and Interpretation). Applied only to IB maths points marking.
const MATH_MARKING_CONVENTIONS = `IB MATHEMATICS MARKING CONVENTIONS (apply exactly):
- M = a valid method (must be seen; an implied (M) may be awarded if correct subsequent working shows it). A = an answer/accuracy mark and is normally DEPENDENT on the preceding M — do not award an A where the required M was not earned (no "M0 then A1").
- Do NOT automatically give full marks for a correct final answer: check the working and award M/A per the method actually shown. Multiple A marks on one step are independent (a wrong first value then two correct values = A0A1A1).
- ISW (ignore subsequent working): once a correct answer is seen, ignore further correct working. But if later working shows a genuine misunderstanding, withhold the final A. A correct exact value followed by an incorrect decimal still earns the mark, unless that wrong decimal is carried into a later part.
- AG (answer given): when the answer is printed in the question, award marks only for valid working that genuinely leads to it — never for merely restating the given answer.
- Follow-through / "their": if an earlier error is used correctly later, award FT marks for the subsequent work (working must usually be shown). Within a part, after an error no further A marks for work that uses the error, though M marks may still be earned. Do NOT award the final-answer mark if the error yields an impossible value (probability > 1, sin θ > 1, |r| ≥ 1 for an infinite GP sum, a non-integer where an integer is required, etc.).
- Mis-read (MR): if the candidate miscopies data from the question, apply a 1-mark penalty to that question (only when working is seen); miscopying their own work is an error, not an MR.
- Accept equivalent exact forms and answers that round to the required accuracy.`

export function buildIbCatalogPointsPrompt(params: {
  subjectName: string
  componentLabel: string
  questionText: string
  ocrText: string
  accept?: string
  ecf?: string
  officialScheme?: string | null
  totalMarks?: number | null
  mathConventions?: boolean
}): string {
  const { subjectName, componentLabel, questionText, ocrText, accept, ecf, officialScheme, totalMarks, mathConventions } = params
  const conventions = [
    ecf ? `Follow-through / ECF: ${ecf}` : null,
    accept ? `Accept equivalent forms: ${accept}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const hasTotal = typeof totalMarks === 'number' && totalMarks > 0
  const totalInstruction = hasTotal
    ? `TOTAL MARKS AVAILABLE: ${totalMarks}. Mark out of EXACTLY ${totalMarks} — "total_marks" must equal ${totalMarks}. Break this total into M/A/R marks per part.`
    : `Determine the TOTAL MARKS AVAILABLE from the question itself — IB questions state the maximum mark and/or marks per part. Break the total into M/A/R marks per part.`

  return `You are an IB Diploma Programme ${subjectName} examiner marking a response to a ${componentLabel} question.

IB ${subjectName} papers are marked with ANALYTIC MARKSCHEMES, not markbands: award method marks (M) for a valid method, accuracy/answer marks (A) for correct results, and reasoning marks (R/AG) where required. There are NO Cambridge conventions and NO level descriptors here.
${mathConventions ? `\n${MATH_MARKING_CONVENTIONS}\n` : ''}
${conventions ? `MARKING CONVENTIONS (official):\n${conventions}\n` : ''}
${totalInstruction} Mark each independently, applying ECF so a wrong earlier value still earns method and subsequent marks where the method is sound.

QUESTION:
${questionText}
${officialScheme ? `\nOFFICIAL MARKSCHEME (apply exactly; accept stated equivalents):\n${officialScheme}\n` : ''}
STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each mark: state its label in "type" (e.g. "M1", "A1"), whether earned, and why in plain English.

${TONE_BLOCK}

${ERROR_CLASSIFICATION_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "marks_awarded": [
    {
      "mark_id": 1,
      "type": "M1",
      "earned": true,
      "reasoning": "...",
      "error_classification": "no_error",
      "line_reference": "",
      "margin_note": null
    }
  ],
  "marks_earned": 0,
  "total_marks": ${hasTotal ? totalMarks : 0},
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "marking_style": "point_based"
}`
}

export function buildIbLorMarkingPrompt(
  subjectName: string,
  questionText: string,
  totalMarks: number,
  markSchemeJson: string,
  ocrText: string
): string {
  return `You are an IB Diploma Programme ${subjectName} senior examiner marking an extended response against the IB markbands and assessment criteria. Work like a real examiner at a marking conference:

1. Read the student's response holistically
2. Compare against the IB markband / achievement-level descriptors (and any per-criterion descriptors) in the markscheme
3. Decide which band best fits — IB uses level descriptors and assessment criteria, NOT Cambridge assessment objectives or B1/M1/A1 codes
4. Place the response within that band — top, middle or bottom — and assign a specific mark
5. Justify your placement by quoting the descriptor wording the response meets or misses

QUESTION:
${questionText}

TOTAL MARKS AVAILABLE: ${totalMarks}

OFFICIAL IB MARKSCHEME (with markband / criterion descriptors):
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

${TONE_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "band_result": {
    "level": 3,
    "marks_awarded": 10,
    "marks_available": ${totalMarks},
    "band_descriptor": "The markband descriptor for the band you placed them in",
    "justification": "Detailed examiner justification referencing the band/criterion descriptors",
    "strengths": ["what they did well"],
    "improvements": ["what would push them into the next band"]
  },
  "marks_earned": 10,
  "total_marks": ${totalMarks},
  "marks_awarded": [],
  "summary": "Overall examiner feedback to the student",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "marking_style": "level_of_response"
}`
}

/** IB multi-criterion marking (EE, TOK, Visual Arts comparative study, etc.). */
export function buildIbCriterionMarkingPrompt(
  subjectName: string,
  questionText: string,
  totalMarks: number,
  markSchemeJson: string,
  ocrText: string
): string {
  return `You are an IB Diploma Programme ${subjectName} senior examiner. Mark this student work against the official IB assessment criteria and level descriptors in the markscheme.

Work like a real IB marking conference:
1. Read the response holistically for each criterion
2. Match descriptor wording — quote the band language the work meets or misses
3. Place within the band (top/middle/bottom) before assigning marks
4. IB uses assessment criteria and markbands — NOT Cambridge B1/M1/A1 codes

QUESTION / TASK:
${questionText}

TOTAL MARKS AVAILABLE: ${totalMarks}

OFFICIAL IB CRITERION MARKSCHEME:
${markSchemeJson}

STUDENT'S TRANSCRIBED WORK:
${ocrText}

${TONE_BLOCK}

${MATH_NOTATION_BLOCK}

${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "criteria_results": [
    {
      "criterion": "A",
      "criterion_name": "Focus and method",
      "level": 3,
      "marks_awarded": 4,
      "marks_available": 6,
      "band_descriptor": "The descriptor for the band you placed them in",
      "justification": "Detailed examiner justification referencing descriptor wording",
      "strengths": ["..."],
      "improvements": ["what would reach the next band"]
    }
  ],
  "band_result": {
    "level": 3,
    "marks_awarded": 0,
    "marks_available": ${totalMarks},
    "band_descriptor": "Overall summary band for the whole response",
    "justification": "Holistic summary across criteria",
    "strengths": ["..."],
    "improvements": ["..."]
  },
  "marks_earned": 0,
  "total_marks": ${totalMarks},
  "marks_awarded": [],
  "summary": "Encouraging examiner feedback to the student",
  "weak_topics": ["..."],
  "what_to_study_next": "...",
  "marking_style": "level_of_response"
}

Set band_result.marks_awarded and marks_earned to the SUM of criteria_results marks. Include one criteria_results entry per criterion in the markscheme.`
}

/**
 * Second-opinion / verify pass. Re-marks the student's answer to catch a first
 * marker's errors — chiefly UNDER-marking on longer questions, the biggest driver
 * of run-to-run score variance. Outputs the SAME JSON shape the first marker used
 * (points or criteria), so downstream normalize + reconcile are unchanged.
 */
export function buildVerifyMarkingPrompt(params: {
  subjectName: string
  board: string
  questionText: string
  ocrText: string
  schemeJson: string | null
  priorResultJson: string
  totalMarks: number | null
}): string {
  const {
    subjectName,
    board,
    questionText,
    ocrText,
    schemeJson,
    priorResultJson,
    totalMarks,
  } = params
  const totalLine =
    totalMarks && totalMarks > 0
      ? `This question is worth EXACTLY ${totalMarks} marks — "total_marks" must equal ${totalMarks} and marks_earned must not exceed it.`
      : ''

  return `You are a SENIOR ${board} ${subjectName} examiner reviewing a first marker's marking and correcting its errors.

A first (junior) marker frequently UNDER-marks: they withhold marks the student genuinely earned because the student's method or wording differs from the mark scheme. They occasionally OVER-mark too. Re-mark the student's work carefully and independently, then output a corrected result.

QUESTION:
${questionText}
${schemeJson ? `\nMARK SCHEME:\n${schemeJson}\n` : ''}
STUDENT'S ANSWER (transcribed):
${ocrText}

FIRST MARKER'S RESULT — verify and CORRECT this; it may be wrong:
${priorResultJson}

How to re-mark:
- Check EVERY step of the student's working. Award every mark the student earned, accepting ANY mathematically/scientifically valid method and equivalent correct forms, and applying error-carried-forward.
- Remove marks awarded for work the student did not actually do.
- ${totalLine}
- marks_earned must equal the sum of the individual marks (or criteria marks) you award.

${JSON_RULES_BLOCK}

Return the CORRECTED marking as JSON in EXACTLY the same shape and field names as the first marker's result above. Return ONLY the JSON object.`
}

const DETECTION_SUBJECT_CODES = `9084 Law, 9231 Further Math, 9488 Islamic Studies, 9489 History, 9607 Media Studies, 9609 Business, 9618 Computer Science, 9699 Sociology, 9700 Biology, 9701 Chemistry, 9702 Physics, 9706 Accounting, 9708 Economics, 9709 Math, 9990 Psychology`

export function buildDetectionPrompt(
  ocrText: string,
  questionText: string,
  subjectHint?: string
): string {
  const subjectLine = subjectHint
    ? `The student is studying ${subjectHint}. Prefer that subject's paper codes when headers match.`
    : `Consider ALL of these Cambridge A-Level codes before deciding: ${DETECTION_SUBJECT_CODES}.`

  const questionBlock =
    questionText.trim().length > 0
      ? questionText.trim()
      : '[not provided — rely on answer headers only]'

  return `You are analyzing a Cambridge International A-Level student work submission. Determine if this is from an official past exam paper AND which subject it belongs to.

STEP 1 — SUBJECT FROM CONTENT (do this FIRST; question text outweighs weak header guesses):
Read the QUESTION TEXT and answer for subject-specific signals. Consider every code in: ${DETECTION_SUBJECT_CODES}.

Subject markers (non-exhaustive):
- Math (9709/9231): equations, integrals, derivatives, quadratics, "differentiate", "integrate", "binomial expansion", trigonometric identities, x^2 coefficients
- Physics (9702): forces, velocity, acceleration, circuits, waves, F = ma, units m/s, N, J
- Chemistry (9701): chemical formulas (H2O, NaCl, Al^3+, Mg^2+), ionic/covalent bonding, "ionic radius", moles, electronegativity, pH, redox
- Biology (9700): cells, DNA, photosynthesis, enzymes, organisms
- History (9489): dates, named events, "to what extent", causes of wars/revolutions
- Economics (9708): demand/supply, GDP, inflation, elasticity
- Psychology (9990): cognitive/behavioural psychology terms
- And analogous discipline-specific vocabulary for the other codes listed above.

Do NOT default to Mathematics (9709) when the question is clearly science, humanities, or social science.

STEP 2 — PAST PAPER HEADERS (only if present in the OCR):
- Paper code patterns: "9701/22", "9709/12", "9702/11", "9489/21", etc. (subject/component with slash)
- Session: "May/June 2024", "m/j/24", "October/November 2023"
- Question number: "1", "2(a)", "3(b)(i)" (lowercase letters, roman numerals)

The paper_code subject prefix MUST match the subject you identified in Step 1. If headers say 9709 but the question is clearly Chemistry (9701), set is_past_paper=false and explain the mismatch — do not guess Math.

QUESTION TEXT (primary for subject identification):
${questionBlock}

STUDENT'S TRANSCRIBED ANSWER (headers / handwriting):
${ocrText}

${subjectLine}

Normalize when confident:
- paper_code: "9701/22" (subject/component with slash — use the code from Step 1)
- paper_session: full session name
- question_number: as on the paper

Return ONLY this JSON, no markdown:
{
  "is_past_paper": true,
  "confidence": "high",
  "paper_code": "9701/22",
  "paper_session": "May/June 2024",
  "question_number": "1(b)",
  "reasoning": "Brief explanation citing subject markers and any header evidence"
}

Rules:
- Set is_past_paper=false if confidence is "low", headers are absent/ambiguous, or subject in headers conflicts with question content.
- When genuinely uncertain after considering all subjects, return is_past_paper=false and omit paper_code (or set it to null) — never guess 9709 as a fallback.
- Examples of valid codes: 9701/22 (Chemistry), 9702/11 (Physics), 9709/12 (Math), 9489/21 (History).`
}

export function buildPracticeQuestionExtractPrompt(
  ocrText: string,
  subjectName: string,
  subjectCode: string
): string {
  return `You are preparing a ${subjectName} (${subjectCode}) homework script for marking.

The student uploaded one or more photos. The transcript may contain BOTH the question and their answer.

TRANSCRIPT:
${ocrText}

TASK:
1. Find the exam/homework QUESTION wording (stem, parts, given data). This is usually at the top or before working begins.
2. Separate the student's ANSWER / working only (not the question text).
3. If there is no clear question on the page — only working — set question_found to false.

Return ONLY JSON:
{
  "question_found": true,
  "question_text": "Full question as it appears or a faithful paraphrase",
  "answer_text": "Only the student's working and final answer"
}

Rules:
- question_text must be usable by an examiner who cannot see the image.
- answer_text must not repeat the question stem.
- For a single problem, return one question_found block (not multiple questions).
- Use $...$ for maths where helpful.`
}

export function buildWholePaperSegmentPrompt(ocrText: string): string {
  return `Segment this student's handwritten exam paper into individual question answers.

STUDENT'S FULL TRANSCRIBED PAPER:
${ocrText}

Identify paper headers (code, session) and split answers by question number.

Return ONLY JSON:
{
  "paper_code": "9702/11",
  "paper_session": "May/June 2024",
  "questions": [
    { "question_number": "1", "answer_text": "student's answer for Q1" },
    { "question_number": "2", "answer_text": "..." }
  ]
}`
}
