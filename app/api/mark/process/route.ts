import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/lib/supabase-server'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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

function extractJSON(text: string): any {
  const jsonMatch =
    text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/) ||
    text.match(/{[\s\S]*}/)

  const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text
  return JSON.parse(jsonString)
}

export async function POST(request: NextRequest) {
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
    const mode = (formData.get('mode') as string) || 'past_paper'
    const answerPhoto = formData.get('photo') as File

    if (!answerPhoto) {
      return NextResponse.json({ error: 'Answer photo is required' }, { status: 400 })
    }

    // ============ MODE 1: PAST PAPER ============
    if (mode === 'past_paper') {
      const markSchemeId = formData.get('mark_scheme_id') as string

      if (!markSchemeId) {
        return NextResponse.json({ error: 'Mark scheme ID required' }, { status: 400 })
      }

      const { data: markScheme, error: msError } = await supabaseAdmin
        .from('mark_schemes')
        .select('*')
        .eq('id', markSchemeId)
        .single()

      if (msError || !markScheme) {
        return NextResponse.json({ error: 'Mark scheme not found' }, { status: 404 })
      }

      // OCR student's answer
      const ocrText = await ocrImage(
        answerPhoto,
        `Transcribe this handwritten Cambridge A-Level Mathematics answer exactly as shown.
Rules:
- Preserve all steps in order
- Use ^ for exponents, sqrt() for roots
- Capture every equation and final answer
- Include working even if incorrect
- Output only the raw transcription`
      )

      if (!ocrText || ocrText.trim().length < 5) {
        return NextResponse.json(
          { error: 'No handwriting detected. Try a clearer photo.' },
          { status: 400 }
        )
      }

      // Mark with mark scheme
      const markingPrompt = `You are a Cambridge International A-Level Mathematics examiner. Apply the mark scheme exactly as a real Cambridge examiner would.

QUESTION:
${markScheme.question_text}

TOTAL MARKS AVAILABLE: ${markScheme.total_marks}

OFFICIAL MARK SCHEME:
${JSON.stringify(markScheme.mark_scheme, null, 2)}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

For each mark in the scheme: decide if earned, explain why. Apply ECF rules per "ecf_from". Use "acceptable_forms" to recognize equivalents.

Return ONLY this JSON (no markdown):
{
  "marks_awarded": [
    {"mark_id": 1, "type": "B1", "earned": true, "reasoning": "..."}
  ],
  "marks_earned": 3,
  "total_marks": 3,
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "..."
}`

      const claudeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: markingPrompt }],
      })

      const markingText =
        claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
      const markingResult = extractJSON(markingText)

      // Store attempt
      const { data: attempt } = await supabaseAdmin
        .from('attempts')
        .insert({
          mark_scheme_id: markSchemeId,
          source_type: 'past_paper',
          user_id: userId,
          ocr_text: ocrText,
          ai_marking: markingResult,
          marks_earned: markingResult.marks_earned,
          total_marks: markingResult.total_marks,
        })
        .select()
        .single()

      // Increment rate limit counter
      await supabaseAdmin.from('rate_limits').upsert(
        {
          ip,
          date: today,
          mark_count: currentCount + 1,
        },
        { onConflict: 'ip,date' }
      )

      return NextResponse.json({
        marks_earned: markingResult.marks_earned,
        total_marks: markingResult.total_marks,
        ai_marking: markingResult,
        ocr_text: ocrText,
        attempt_id: attempt?.id,
      })
    }

    // ============ MODE 2: OTHER QUESTION ============
    if (mode === 'other') {
      const questionPhoto = formData.get('question_photo') as File | null
      const questionTextInput = formData.get('question_text') as string | null

      if (!questionPhoto && !questionTextInput) {
        return NextResponse.json(
          { error: 'Either a question photo or typed question text is required' },
          { status: 400 }
        )
      }

      // Get question text (from photo OCR or typed input)
      let questionText = questionTextInput || ''
      if (questionPhoto && !questionTextInput) {
        questionText = await ocrImage(
          questionPhoto,
          `Transcribe this A-Level Mathematics question exactly as written.
Rules:
- Capture the full question including any sub-parts like (a), (b)
- Use ^ for exponents, sqrt() for roots, _ for subscripts
- Include any marks notation in brackets like [4]
- Describe diagrams briefly in [brackets] if present
- Output only the question text, nothing else`
        )
      }

      if (!questionText || questionText.trim().length < 10) {
        return NextResponse.json(
          { error: 'Could not read the question. Try a clearer photo or type it out.' },
          { status: 400 }
        )
      }

      // OCR the answer
      const ocrText = await ocrImage(
        answerPhoto,
        `Transcribe this handwritten A-Level Mathematics answer exactly as shown.
Rules:
- Preserve all steps in order
- Use ^ for exponents, sqrt() for roots
- Capture every equation and final answer
- Include working even if incorrect
- Output only the raw transcription`
      )

      if (!ocrText || ocrText.trim().length < 5) {
        return NextResponse.json(
          { error: 'No handwriting detected in the answer photo.' },
          { status: 400 }
        )
      }

      // Mark without official mark scheme - use general A-Level marking principles
      const markingPrompt = `You are an experienced Cambridge International A-Level Mathematics examiner. The student has uploaded a question from a non-past-paper source (textbook, worksheet, tutor, etc.) along with their answer. Mark it using standard Cambridge A-Level marking conventions.

QUESTION:
${questionText}

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

Return ONLY this JSON (no markdown):
{
  "estimated_marks_explanation": "Brief note on how you allocated total marks for this question",
  "marks_awarded": [
    {"mark_id": 1, "type": "M1", "earned": true, "reasoning": "..."},
    {"mark_id": 2, "type": "A1", "earned": false, "reasoning": "..."}
  ],
  "marks_earned": 1,
  "total_marks": 4,
  "summary": "...",
  "weak_topics": ["..."],
  "what_to_study_next": "..."
}`

      const claudeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: markingPrompt }],
      })

      const markingText =
        claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
      const markingResult = extractJSON(markingText)

      // Store attempt
      const { data: attempt } = await supabaseAdmin
        .from('attempts')
        .insert({
          mark_scheme_id: null,
          source_type: 'other',
          user_id: userId,
          question_text: questionText,
          ocr_text: ocrText,
          ai_marking: markingResult,
          marks_earned: markingResult.marks_earned,
          total_marks: markingResult.total_marks,
        })
        .select()
        .single()

      // Increment rate limit counter
      await supabaseAdmin.from('rate_limits').upsert(
        {
          ip,
          date: today,
          mark_count: currentCount + 1,
        },
        { onConflict: 'ip,date' }
      )

      return NextResponse.json({
        marks_earned: markingResult.marks_earned,
        total_marks: markingResult.total_marks,
        ai_marking: markingResult,
        ocr_text: ocrText,
        question_text: questionText,
        attempt_id: attempt?.id,
      })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (err) {
    console.error('Marking error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}