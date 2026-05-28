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

  return `You are a Cambridge International A-Level ${subjectName} examiner. Mark this student's work against the official mark scheme using point-based Cambridge conventions (B1/M1/A1/C1 marks, "award 1 mark for...", ECF where stated).

QUESTION:
${questionText}

TOTAL MARKS AVAILABLE: ${totalMarks}

OFFICIAL MARK SCHEME:
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each discrete mark in the scheme: decide if earned, explain why in plain English. Apply ECF rules. Accept equivalent correct forms.

${TONE_BLOCK}
${taggingBlock}
${ERROR_CLASSIFICATION_BLOCK}

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
  "total_marks": ${totalMarks},
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
  markSchemeJson: string,
  ocrText: string,
  totalMarks: number,
  syllabusBlock?: string
): string {
  const taggingBlock = syllabusBlock
    ? `\n${syllabusBlock}\n`
    : ''
  const tagsField = syllabusBlock
    ? ',\n  "syllabus_tags": ["code"]'
    : ''

  return `You are marking a Cambridge A-Level ${subjectName} multiple-choice paper.

Extract the student's selected answers from their transcribed work (e.g. "1 C, 2 B" or circled letters).
Compare against the official answer key.

OFFICIAL ANSWER KEY:
${markSchemeJson}

STUDENT'S TRANSCRIBED ANSWERS:
${ocrText}

For each question: record student answer, correct answer, whether correct.
Score = number of correct answers. If partial paper, only mark questions present in student work.
${taggingBlock}
${JSON_RULES_BLOCK}

Return ONLY this JSON:
{
  "mcq_breakdown": [
    { "question_number": "1", "student_answer": "C", "correct_answer": "C", "correct": true }
  ],
  "marks_earned": 0,
  "total_marks": ${totalMarks},
  "marks_awarded": [],
  "summary": "...",
  "weak_topics": ["topics linked to wrong answers"],
  "what_to_study_next": "...",
  "marking_style": "mcq"${tagsField}
}`
}

export function buildDetectionPrompt(
  ocrText: string,
  questionText: string,
  subjectHint?: string
): string {
  const subjectLine = subjectHint
    ? `The student is studying ${subjectHint}. Look for that subject's paper codes.`
    : 'Look for any Cambridge A-Level subject code (9709, 9702, 9489, etc.)'

  return `You are analyzing a Cambridge International A-Level student work submission. Determine if this is from an official past exam paper.

STUDENT'S TRANSCRIBED ANSWER (and any visible headers):
${ocrText}

QUESTION TEXT (if separately provided):
${questionText || '[not provided]'}

${subjectLine}

Look for indicators that this is from a past paper:
- Paper code patterns like "9709/12", "9702/11", "9489/21", etc.
- Session indicators like "May/June 2024", "m/j/24", "Oct/Nov 23"
- Standard question number formats like "1", "2(a)", "3(b)(i)"

Normalize the paper info to standard format:
- paper_code: "9709/12" (subject/component, with slash)
- paper_session: "May/June 2024" or "October/November 2023" (full session name)
- question_number: "1" or "2(a)" or "3(b)(i)" (use lowercase letters and roman numerals)

Return ONLY this JSON, no markdown:
{
  "is_past_paper": true,
  "confidence": "high",
  "paper_code": "9709/12",
  "paper_session": "May/June 2024",
  "question_number": "1",
  "reasoning": "Brief explanation of what indicators you found"
}

Set is_past_paper=false if confidence would be "low" or you have no clear indicators. When in doubt, return false.`
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
