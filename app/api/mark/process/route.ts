import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60 // Allow up to 60s for AI processing

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const photo = formData.get('photo') as File
    const markSchemeId = formData.get('mark_scheme_id') as string

    if (!photo || !markSchemeId) {
      return NextResponse.json(
        { error: 'Photo and mark scheme ID are required' },
        { status: 400 }
      )
    }

    // STEP 1: Fetch the mark scheme from database
    const { data: markScheme, error: msError } = await supabaseAdmin
      .from('mark_schemes')
      .select('*')
      .eq('id', markSchemeId)
      .single()

    if (msError || !markScheme) {
      return NextResponse.json({ error: 'Mark scheme not found' }, { status: 404 })
    }

    // STEP 2: Convert uploaded photo to buffer + base64
    const photoBytes = await photo.arrayBuffer()
    const photoBuffer = Buffer.from(photoBytes)
    const base64Image = photoBuffer.toString('base64')

    // STEP 3: Upload to Supabase Storage (for record-keeping)
    const fileName = `${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('paper-photos')
      .upload(fileName, photoBuffer, {
        contentType: photo.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      // Don't fail the whole request — we can still mark without storing
    }

    // STEP 4: OCR with Gemini Vision
    let ocrText = ''
    try {
      const ocrResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: photo.type,
                  data: base64Image,
                },
              },
              {
                text: `Transcribe this handwritten Cambridge A-Level Mathematics answer exactly as shown.

Rules:
- Preserve all steps in the order written
- Use ^ for exponents (e.g., x^2), sqrt() for square roots
- Capture every equation, expression, and final answer
- Include the student's working even if it looks incorrect
- Do NOT interpret, mark, or comment — just transcribe

Output only the raw transcribed text.`,
              },
            ],
          },
        ],
      })

      ocrText = ocrResponse.text || ''
    } catch (ocrError) {
      console.error('OCR failed:', ocrError)
      return NextResponse.json(
        { error: 'Could not read the image. Make sure the photo is clear and well-lit.' },
        { status: 500 }
      )
    }

    if (!ocrText || ocrText.trim().length < 5) {
      return NextResponse.json(
        { error: 'No handwriting detected in the image. Try a clearer photo.' },
        { status: 400 }
      )
    }

    // STEP 5: Mark with Claude using the mark scheme
    const markingPrompt = `You are a Cambridge International A-Level Mathematics examiner. Apply the mark scheme exactly as a real Cambridge examiner would — strict, fair, and following the official guidance.

QUESTION:
${markScheme.question_text}

TOTAL MARKS AVAILABLE: ${markScheme.total_marks}

OFFICIAL MARK SCHEME:
${JSON.stringify(markScheme.mark_scheme, null, 2)}

STUDENT'S TRANSCRIBED ANSWER:
${ocrText}

MARKING INSTRUCTIONS:
1. Go through each individual mark in the mark scheme array (id 1, 2, 3, etc.)
2. For each mark, decide: did the student earn it? (true/false)
3. Apply ECF (error carried forward) rules per the "ecf_from" field — if a student got a previous mark wrong but used their answer correctly in the next step, give the next mark
4. Use "acceptable_forms" to recognize equivalent answers
5. Be aware of "common_errors" — flag if the student made one

Return ONLY a JSON object in this exact structure (no markdown, no commentary, just JSON):
{
  "marks_awarded": [
    {
      "mark_id": 1,
      "type": "B1",
      "earned": true,
      "reasoning": "Student correctly found 240 as coefficient of x^2 in the expansion"
    }
  ],
  "marks_earned": 3,
  "total_marks": 3,
  "summary": "Strong attempt. Student worked through the problem methodically.",
  "weak_topics": ["binomial expansion sign handling"],
  "what_to_study_next": "Review nCr coefficient calculations and sign rules for negative bases in binomial expansion."
}`

    let markingResult
    try {
      const claudeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: markingPrompt }],
      })

      const markingText =
        claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''

      // Extract JSON (Claude sometimes wraps in code fences)
      const jsonMatch =
        markingText.match(/```json\n([\s\S]*?)\n```/) ||
        markingText.match(/```\n([\s\S]*?)\n```/) ||
        markingText.match(/{[\s\S]*}/)

      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : markingText
      markingResult = JSON.parse(jsonString)
    } catch (claudeError) {
      console.error('Claude marking failed:', claudeError)
      return NextResponse.json(
        { error: 'AI marking failed. Please try again.' },
        { status: 500 }
      )
    }

    // STEP 6: Save the attempt
    const { data: attempt } = await supabaseAdmin
      .from('attempts')
      .insert({
        mark_scheme_id: markSchemeId,
        photo_url: uploadData?.path || null,
        ocr_text: ocrText,
        ai_marking: markingResult,
        marks_earned: markingResult.marks_earned,
        total_marks: markingResult.total_marks,
      })
      .select()
      .single()

    // STEP 7: Return the result
    return NextResponse.json({
      marks_earned: markingResult.marks_earned,
      total_marks: markingResult.total_marks,
      ai_marking: markingResult,
      ocr_text: ocrText,
      attempt_id: attempt?.id,
    })
  } catch (err) {
    console.error('Marking error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}