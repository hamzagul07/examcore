import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { normalizeSyllabusTags, type SyllabusCode } from '@/lib/syllabus'
import {
  buildLineReferences,
  parseOcrLines,
  type OcrLine,
} from '@/lib/examiner-ink-positioning'
import { normalizeErrorClassification } from '@/lib/error-classifications'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SUBJECT_CODE_MAP: Record<string, string> = {
  '9709': 'Mathematics',
  '9231': 'Further Mathematics',
  '9702': 'Physics',
  '9701': 'Chemistry',
  '9700': 'Biology',
  '9618': 'Computer Science',
  '9608': 'Computer Science (legacy)',
}

async function ocrImage(file: File, prompt: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.type, data: base64 } },
          { text: prompt },
        ],
      },
    ],
  })

  return response.text || ''
}

const ANSWER_OCR_PROMPT = `Transcribe the handwritten Cambridge A-Level Mathematics work in this image. For each line of working, provide:
1. The text content (use ^ for exponents, sqrt() for roots, * for multiplication where useful).
2. The bounding box as percentages of the image dimensions: top, left, width, height (each 0-100).

Also capture any visible header text, paper codes, question numbers, or session info (e.g., "9709/12", "May/June 2024", "Question 4") as separate header lines.

Output ONLY this JSON, no prose, no markdown fences:
{
  "full_text": "complete transcribed work, line breaks preserved",
  "lines": [
    { "text": "240 = 12 × 80a²", "bbox": { "top": 35.2, "left": 12.0, "width": 45.0, "height": 4.5 } }
  ]
}

Rules:
- Be precise with bounding boxes — they will overlay examiner marks on the original image.
- One JSON object per writing line; don't merge multiple lines.
- Include every step, even incorrect ones.
- Output ONLY valid JSON. No surrounding commentary.`

/**
 * OCR the student's handwritten answer with per-line bounding boxes.
 * Falls back gracefully when the model can't produce structured output:
 *  - `full_text` is always returned (used downstream by Claude + DB).
 *  - `lines` may be empty; the overlay then renders marks in the "general
 *    feedback" section instead of pinned to the image.
 */
async function ocrAnswerWithBoxes(
  file: File
): Promise<{ full_text: string; lines: OcrLine[] }> {
  const raw = await ocrImage(file, ANSWER_OCR_PROMPT)
  const parsed = parseOcrLines(raw)
  if (parsed && (parsed.full_text || parsed.lines.length > 0)) {
    // If we have lines but full_text came back empty (rare), synthesise it.
    const fullText =
      parsed.full_text || parsed.lines.map((l) => l.text).join('\n')
    return { full_text: fullText, lines: parsed.lines }
  }
  // Couldn't parse JSON — treat the whole response as plain transcription.
  return { full_text: raw.trim(), lines: [] }
}

async function uploadAnswerPhoto(
  file: File,
  userId: string | null
): Promise<string | null> {
  try {
    const bytes = await file.arrayBuffer()
    const ext = (file.type.split('/')[1] || 'jpg').toLowerCase()
    const prefix = userId || 'anon'
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('answer-photos')
      .upload(path, Buffer.from(bytes), {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
    if (uploadError) {
      console.error('answer-photos upload error:', uploadError)
      return null
    }
    const { data: pub } = supabaseAdmin.storage
      .from('answer-photos')
      .getPublicUrl(path)
    return pub?.publicUrl || null
  } catch (err) {
    console.error('uploadAnswerPhoto unexpected error:', err)
    return null
  }
}

function extractJSON(text: string): any {
  const jsonMatch =
    text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/) ||
    text.match(/{[\s\S]*}/)

  const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

  try {
    return JSON.parse(jsonString)
  } catch (firstError) {
    // Common failure: LLM emits single-backslash LaTeX (e.g. "\frac") which is
    // invalid JSON. jsonrepair handles bad escapes, trailing commas, unquoted
    // keys, and similar near-misses.
    try {
      const repaired = jsonrepair(jsonString)
      return JSON.parse(repaired)
    } catch {
      throw firstError
    }
  }
}

function sessionNameToCode(sessionName: string): string | null {
  const match = sessionName.match(
    /(May\/June|October\/November|February\/March)\s+(\d{4})/i
  )
  if (!match) return null
  const [, season, year] = match
  const yearCode = year.slice(2)
  const lowered = season.toLowerCase()
  const seasonCode = lowered.includes('may')
    ? 's'
    : lowered.includes('october')
    ? 'w'
    : lowered.includes('february')
    ? 'm'
    : null
  if (!seasonCode) return null
  return `${seasonCode}${yearCode}`
}

async function tryExtractFromStorage(
  paper_code: string,
  paper_session: string,
  question_number: string
): Promise<any | null> {
  try {
    // Step A: parse identifiers
    const [subject_code, component] = paper_code.split('/')
    if (!subject_code || !component) return null

    const session_code = sessionNameToCode(paper_session)
    if (!session_code) return null

    // Step B: storage paths
    const qpPath = `cambridge/${subject_code}/${session_code}/qp_${component}.pdf`
    const msPath = `cambridge/${subject_code}/${session_code}/ms_${component}.pdf`

    // Step C: download both PDFs (return null silently on miss — these are expected)
    const [qpResult, msResult] = await Promise.all([
      supabaseAdmin.storage.from('paper-pdfs').download(qpPath),
      supabaseAdmin.storage.from('paper-pdfs').download(msPath),
    ])

    if (qpResult.error || !qpResult.data) return null
    if (msResult.error || !msResult.data) return null

    // Step D: blobs → base64
    const qpBase64 = Buffer.from(await qpResult.data.arrayBuffer()).toString('base64')
    const msBase64 = Buffer.from(await msResult.data.arrayBuffer()).toString('base64')

    // Step E: Gemini extraction
    const extractionPrompt = `You are extracting Cambridge International A-Level mark schemes from official PDFs. You have been given:
- The QUESTION PAPER (first PDF) — contains the actual problem statements
- The MARK SCHEME (second PDF) — contains the marking criteria

For every question and sub-part in this paper (including 1, 2(a), 2(b), 3(a)(i), etc.), cross-reference both PDFs to extract:

1. question_number — exactly as printed, e.g. "1", "2(a)", "3(b)(i)" (use lowercase letters and roman numerals)
2. question_text — the full problem statement from the question paper
3. total_marks — sum of marks for this question/sub-part from the mark scheme
4. mark_scheme — structured JSON with the marking criteria

The mark_scheme JSON structure:
{
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
  "acceptable_final_answers": ["3", "3.0", "three"],
  "common_errors": ["What students commonly get wrong"],
  "notes": "Examiner notes if any"
}

Mark types: B1, M1, A1, B2, M2, A2, DM1 etc. (B = independent, M = method, A = accuracy, D = dependent)

Be thorough. Extract EVERY question, every sub-part. Don't skip any. Be precise about mark types and values.

Output ONLY this JSON (no markdown):
{
  "questions": [
    {
      "question_number": "1",
      "question_text": "...",
      "total_marks": 3,
      "mark_scheme": { ... }
    }
  ]
}`

    let extractionText = ''
    try {
      const extractionResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: qpBase64 } },
              { inlineData: { mimeType: 'application/pdf', data: msBase64 } },
              { text: extractionPrompt },
            ],
          },
        ],
      })
      extractionText = extractionResponse.text || ''
    } catch (err) {
      console.error('Gemini extraction error:', err)
      return null
    }

    let parsed: any
    try {
      parsed = extractJSON(extractionText)
    } catch (err) {
      console.error('Mark scheme extraction returned malformed JSON:', err)
      return null
    }

    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      console.error('Mark scheme extraction returned no questions')
      return null
    }

    // Step F: validate + upsert
    const subject = SUBJECT_CODE_MAP[subject_code] || 'Unknown'
    const rows: any[] = []

    for (const q of parsed.questions) {
      if (!q || typeof q.question_number !== 'string' || !q.question_number.trim()) {
        continue
      }
      const totalMarks = typeof q.total_marks === 'number' ? q.total_marks : Number(q.total_marks)
      if (!Number.isFinite(totalMarks) || totalMarks <= 0 || !Number.isInteger(totalMarks)) {
        continue
      }
      const ms = q.mark_scheme
      if (!ms || !Array.isArray(ms.marks) || ms.marks.length < 1) {
        continue
      }

      rows.push({
        paper_code,
        paper_session,
        question_number: q.question_number.trim(),
        question_text: typeof q.question_text === 'string' ? q.question_text : '',
        total_marks: totalMarks,
        mark_scheme: ms,
        subject,
        board: 'Cambridge International',
      })
    }

    if (rows.length === 0) {
      console.error('All extracted questions failed validation')
      return null
    }

    const { error: upsertError } = await supabaseAdmin
      .from('mark_schemes')
      .upsert(rows, { onConflict: 'paper_code,paper_session,question_number' })

    if (upsertError) {
      console.error('Mark scheme upsert error:', upsertError)
      // Continue — the requested question may still already exist in DB from a prior run
    }

    // Step G: return the specific question we need
    const { data: foundScheme } = await supabaseAdmin
      .from('mark_schemes')
      .select('*')
      .eq('paper_code', paper_code)
      .eq('paper_session', paper_session)
      .eq('question_number', question_number)
      .maybeSingle()

    return foundScheme ?? null
  } catch (err) {
    console.error('tryExtractFromStorage unexpected error:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  // Capture as the very first thing in the handler so OCR + Claude latency is
  // included. This is intentionally server-side processing time, not student
  // "thinking time" — it's a fair proxy for question difficulty without us
  // needing client-side timing instrumentation.
  const startTime = Date.now()

  try {
    // ============ RATE LIMIT CHECK ============
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const today = new Date().toISOString().split('T')[0]

    const { data: existingLimit } = await supabaseAdmin
      .from('rate_limits')
      .select('mark_count')
      .eq('ip', ip)
      .eq('date', today)
      .maybeSingle()

    if (existingLimit && existingLimit.mark_count >= 10) {
      return NextResponse.json(
        {
          error:
            'Daily limit reached (10 marks per day). The free beta is rate-limited to prevent abuse. Try again tomorrow.',
        },
        { status: 429 }
      )
    }

    const currentCount = existingLimit?.mark_count || 0

    // ============ GET CURRENT USER (IF SIGNED IN) ============
    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    const userId = user?.id || null

    // ============ PARSE FORM DATA ============
    const formData = await request.formData()
    const answerPhoto = formData.get('photo') as File
    const questionPhoto = formData.get('question_photo') as File | null
    const questionTextInput = formData.get('question_text') as string | null
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const manualQuestionNumber = formData.get('manual_question_number') as string | null
    const hasManualSelection = !!(
      manualPaperCode &&
      manualPaperSession &&
      manualQuestionNumber
    )

    if (!answerPhoto) {
      return NextResponse.json({ error: 'Answer photo is required' }, { status: 400 })
    }

    // ============ STEP 1: OCR ANSWER PHOTO (lines + bboxes) ============
    // Done in parallel with the storage upload so the examiner-ink overlay has
    // a URL ready by the time we respond. Both are cheap relative to Claude.
    const [{ full_text: ocrText, lines: ocrLines }, answerPhotoUrl] =
      await Promise.all([
        ocrAnswerWithBoxes(answerPhoto),
        uploadAnswerPhoto(answerPhoto, userId),
      ])

    if (!ocrText || ocrText.trim().length < 5) {
      return NextResponse.json(
        { error: 'No handwriting detected. Try a clearer photo.' },
        { status: 400 }
      )
    }

    // ============ STEP 2: OCR QUESTION PHOTO (IF PROVIDED) ============
    let questionText = questionTextInput?.trim() || ''
    if (questionPhoto && !questionText) {
      questionText = await ocrImage(
        questionPhoto,
        `Transcribe this A-Level Mathematics question exactly as written.
Also capture ANY paper headers, codes, sessions, or question numbers visible.
Rules:
- Capture the full question including any sub-parts like (a), (b)
- Use ^ for exponents, sqrt() for roots, _ for subscripts
- Include any marks notation in brackets like [4]
- Include any header text like "9709/12", "May/June 2024"
- Output only the question text and headers, nothing else`
      )
    }

    // ============ STEP 3: DETECTION (or use manual selection) ============
    let detection: any = { is_past_paper: false }

    if (hasManualSelection) {
      // User manually picked the paper — skip AI detection entirely
      detection = {
        is_past_paper: true,
        confidence: 'high',
        paper_code: manualPaperCode,
        paper_session: manualPaperSession,
        question_number: manualQuestionNumber,
        reasoning: 'Manually selected by user',
      }
    } else {
      const detectionPrompt = `You are analyzing a Cambridge International A-Level Mathematics student work submission. Determine if this is from an official past exam paper.

STUDENT'S TRANSCRIBED ANSWER (and any visible headers):
${ocrText}

QUESTION TEXT (if separately provided):
${questionText || '[not provided]'}

Look for indicators that this is from a past paper:
- Paper code patterns like "9709/12", "9709/13", "9231/01", "9709/11", etc.
- Session indicators like "May/June 2024", "m/j/24", "Oct/Nov 23", "M/J 2024", "October/November 2023", "9709_s24", "9709_w23"
- Standard question number formats like "1", "2(a)", "3(b)(i)"
- References to "Cambridge", "CIE", "examination", "specimen"

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

Set is_past_paper=false if confidence would be "low" or you have no clear indicators. When in doubt, return false — it's better to use general marking than to assert false past-paper matches.`

      const detectionResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: detectionPrompt }],
      })

      const detectionText =
        detectionResponse.content[0].type === 'text'
          ? detectionResponse.content[0].text
          : ''
      try {
        detection = extractJSON(detectionText)
      } catch {
        detection = { is_past_paper: false }
      }
    }

    // ============ STEP 4: ROUTE BASED ON DETECTION ============
    let markingMode:
      | 'official_mark_scheme'
      | 'general_criteria_paper_not_in_db'
      | 'general_criteria' = 'general_criteria'
    let markScheme: any = null
    let detectedPaper: any = null

    if (
      detection.is_past_paper &&
      detection.paper_code &&
      detection.paper_session &&
      detection.question_number
    ) {
      detectedPaper = {
        paper_code: detection.paper_code,
        paper_session: detection.paper_session,
        question_number: detection.question_number,
      }

      const { data: foundScheme } = await supabaseAdmin
        .from('mark_schemes')
        .select('*')
        .eq('paper_code', detection.paper_code)
        .eq('paper_session', detection.paper_session)
        .eq('question_number', detection.question_number)
        .maybeSingle()

      if (foundScheme) {
        markScheme = foundScheme
        markingMode = 'official_mark_scheme'
      } else {
        // Lazy extraction from Storage: download QP + MS PDFs, extract with Gemini, cache, retry lookup
        const extractedScheme = await tryExtractFromStorage(
          detection.paper_code,
          detection.paper_session,
          detection.question_number
        )

        if (extractedScheme) {
          markScheme = extractedScheme
          markingMode = 'official_mark_scheme'
        } else {
          markingMode = 'general_criteria_paper_not_in_db'
        }
      }
    }

    if (markingMode === 'general_criteria' && (!questionText || questionText.trim().length < 10)) {
      return NextResponse.json(
        {
          error:
            'We could not identify this as a past paper question. Please also upload a photo of the question, or type the question text below.',
        },
        { status: 400 }
      )
    }

    // ============ STEP 5: MARK BASED ON MODE ============
    let markingPrompt: string

    const toneBlock = `TONE AND FORMATTING REQUIREMENTS:
- Address the student directly as "you", not "the student"
- Start positive: acknowledge what they got right before what's missing
- Use plain English alongside marking codes (e.g., "You got the method right (M1) but..." instead of just "M1 awarded")
- Be encouraging and specific. Tell them exactly what to fix.
- Format ALL math using LaTeX: inline math in $...$ (e.g., $x^2$, $\\frac{dy}{dx}$, $\\sqrt{16}$), block math in $$...$$
- Use proper LaTeX: \\frac, \\sqrt, ^, _, \\pi, \\int, \\sum etc. NEVER write math as plain text like "x^2" or "sqrt(16)".`

    const syllabusBlock = `SYLLABUS TAGGING:
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

    const errorClassificationBlock = `ERROR CLASSIFICATION:
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

    const jsonRulesBlock = `CRITICAL JSON FORMATTING RULES:
- Output valid JSON ONLY. No prose before or after.
- When including LaTeX math in string values, escape ALL backslashes as double backslashes.
  Examples:
  - Write "\\\\frac{dy}{dx}" NOT "\\frac{dy}{dx}"
  - Write "$\\\\sqrt{16}$" NOT "$\\sqrt{16}$"
  - Write "$x^2 + 2x$" (no backslashes needed, fine as-is)
- This applies to EVERY field: reasoning, summary, weak_topics, what_to_study_next, estimated_marks_explanation, etc.`

    if (markingMode === 'official_mark_scheme') {
      markingPrompt = `You are a Cambridge International A-Level Mathematics examiner marking work for a specific student. Apply the mark scheme exactly as a real Cambridge examiner would, but write your feedback directly to the student.

QUESTION:
${markScheme.question_text}

TOTAL MARKS AVAILABLE: ${markScheme.total_marks}

OFFICIAL MARK SCHEME:
${JSON.stringify(markScheme.mark_scheme, null, 2)}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each mark in the scheme: decide if earned, explain why. Apply ECF rules per "ecf_from". Use "acceptable_forms" to recognize equivalents.

${toneBlock}

${syllabusBlock}

${errorClassificationBlock}

${jsonRulesBlock}

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
    } else {
      markingPrompt = `You are an experienced Cambridge International A-Level Mathematics examiner marking work for a specific student. Mark their answer using standard Cambridge A-Level marking conventions and write your feedback directly to the student.

QUESTION:
${questionText || "[Question not provided — infer from student's work]"}

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

${toneBlock}

${syllabusBlock}

${errorClassificationBlock}

${jsonRulesBlock}

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

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      // Bumped from 2000 to 3000 — error_classification + line_reference +
      // margin_note per mark adds ~50-70 tokens per mark on top of the base
      // reasoning fields. 3000 is enough headroom for ~12-mark questions.
      max_tokens: 3000,
      messages: [{ role: 'user', content: markingPrompt }],
    })

    const markingText =
      claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
    const markingResult = extractJSON(markingText)

    // ============ STEP 5a: BUILD POSITIONAL REFERENCES ============
    // Match Claude's line_reference snippets back to the OCR bbox lines so the
    // overlay knows where to draw. Unmatched marks fall through with bbox=null
    // and the UI renders them in a "general feedback" footer instead.
    const lineReferences = buildLineReferences(
      Array.isArray(markingResult?.marks_awarded) ? markingResult.marks_awarded : [],
      ocrLines
    )

    // Compact classifications array for analytics (separate from line_references
    // because analytics queries shouldn't have to walk through bbox payloads).
    const errorClassifications = Array.isArray(markingResult?.marks_awarded)
      ? markingResult.marks_awarded
          .map((m: any, idx: number) => {
            const classification = normalizeErrorClassification(m?.error_classification)
            return {
              mark_id:
                typeof m?.type === 'string' && m.type.trim()
                  ? m.type.trim().toUpperCase()
                  : `M${idx + 1}`,
              classification,
              description:
                typeof m?.margin_note === 'string' && m.margin_note.trim()
                  ? m.margin_note.trim()
                  : typeof m?.reasoning === 'string'
                  ? m.reasoning.slice(0, 240)
                  : '',
              line_reference:
                typeof m?.line_reference === 'string' ? m.line_reference.trim() : '',
            }
          })
      : []

    // ============ STEP 5b: RESOLVE SYLLABUS TAGS ============
    // Prefer cached tags on the mark_schemes row when available — those have
    // been seen + corrected over time. Fall back to Claude's per-attempt tags
    // for non-past-papers or first-time past papers, and back-fill the mark
    // scheme cache so future students benefit.
    const claudeTags: SyllabusCode[] = normalizeSyllabusTags(
      markingResult?.syllabus_tags
    )

    let resolvedTags: SyllabusCode[] = []
    const cachedTags: SyllabusCode[] = Array.isArray(markScheme?.syllabus_tags)
      ? normalizeSyllabusTags(markScheme.syllabus_tags)
      : []

    if (markingMode === 'official_mark_scheme' && markScheme) {
      if (cachedTags.length > 0) {
        resolvedTags = cachedTags
      } else {
        resolvedTags = claudeTags
        if (resolvedTags.length > 0) {
          const { error: tagBackfillError } = await supabaseAdmin
            .from('mark_schemes')
            .update({ syllabus_tags: resolvedTags })
            .eq('id', markScheme.id)
          if (tagBackfillError) {
            console.error('Mark scheme tag backfill failed:', tagBackfillError)
          }
        }
      }
    } else {
      resolvedTags = claudeTags
    }

    // ============ STEP 6: SAVE ATTEMPT ============
    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startTime) / 1000)
    )

    const { data: attempt } = await supabaseAdmin
      .from('attempts')
      .insert({
        mark_scheme_id: markScheme?.id || null,
        source_type: markingMode === 'official_mark_scheme' ? 'past_paper' : 'other',
        user_id: userId,
        question_text: questionText || (markScheme?.question_text ?? null),
        ocr_text: ocrText,
        ai_marking: markingResult,
        marks_earned: markingResult.marks_earned,
        total_marks: markingResult.total_marks,
        syllabus_tags: resolvedTags,
        time_spent_seconds: timeSpentSeconds,
        answer_photo_url: answerPhotoUrl,
        error_classifications: errorClassifications,
        line_references: lineReferences,
      })
      .select()
      .single()

    // ============ STEP 7: INCREMENT RATE LIMIT ============
    await supabaseAdmin.from('rate_limits').upsert(
      { ip, date: today, mark_count: currentCount + 1 },
      { onConflict: 'ip,date' }
    )

    // ============ STEP 8: RETURN RESPONSE ============
    return NextResponse.json({
      marks_earned: markingResult.marks_earned,
      total_marks: markingResult.total_marks,
      ai_marking: markingResult,
      ocr_text: ocrText,
      question_text: questionText || markScheme?.question_text || null,
      marking_mode: markingMode,
      detected_paper: detectedPaper,
      attempt_id: attempt?.id,
      syllabus_tags: resolvedTags,
      answer_photo_url: answerPhotoUrl,
      line_references: lineReferences,
      error_classifications: errorClassifications,
    })
  } catch (err) {
    console.error('Marking error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
