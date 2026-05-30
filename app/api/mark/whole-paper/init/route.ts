import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import {
  buildWholePaperSegmentPrompt,
  parseWholePaperSegment,
} from '@/lib/marking/whole-paper'
import {
  anthropic,
  ocrAnswerBufferWithBoxes,
  supabaseAdmin,
  uploadAnswerPhoto,
} from '@/lib/marking/mark-runner'
import {
  enrichSegmentsWithPages,
  type StoredPageOcr,
} from '@/lib/marking/whole-paper-pages'
import { withAnthropicRetry } from '@/lib/marking/gemini-retry'
import { ocrPdfToPages } from '@/lib/marking/pdf-pages'
import { genAI } from '@/lib/marking/mark-runner'
import { detectQuestionFromPageText } from '@/lib/marking/page-detection'
import type { WholePaperJobState } from '@/lib/marking/whole-paper-shared'
import {
  estimateMarkingSeconds,
  formatEstimatedTime,
} from '@/lib/marking/whole-paper'

export const maxDuration = 300

type PageAssignment = { index: number; question_number: string | null }

export async function POST(request: NextRequest) {
  try {
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

    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    const userId = user?.id || null

    const formData = await request.formData()
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const assignmentsRaw = formData.get('page_assignments') as string | null

    let pageAssignments: PageAssignment[] = []
    if (assignmentsRaw) {
      try {
        pageAssignments = JSON.parse(assignmentsRaw) as PageAssignment[]
      } catch {
        pageAssignments = []
      }
    }

    if (!manualPaperCode || !manualPaperSession) {
      return NextResponse.json(
        {
          error:
            'Select subject, year, session, and paper for whole-paper marking.',
        },
        { status: 400 }
      )
    }

    const pageFiles: File[] = []
    const pdfFile = formData.get('pdf') as File | null
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('pages') && value instanceof File && value.size > 0) {
        pageFiles.push(value)
      }
    }
    if (pageFiles.length === 0 && formData.get('photo') instanceof File) {
      pageFiles.push(formData.get('photo') as File)
    }

    if (!pdfFile?.size && pageFiles.length === 0) {
      return NextResponse.json(
        { error: 'Upload at least one page image or a PDF.' },
        { status: 400 }
      )
    }

    const subjectCode = manualPaperCode.split('/')[0]
    const pagesOcr: StoredPageOcr[] = []
    const detectedLabels: (string | null)[] = []

    if (pdfFile?.size) {
      const pdfBytes = await pdfFile.arrayBuffer()
      const pages = await ocrPdfToPages(pdfBytes, genAI)
      for (const p of pages) {
        const label = detectQuestionFromPageText(p.full_text)
        detectedLabels.push(label)
        pagesOcr.push({
          photo_url: '',
          full_text: p.full_text,
          ocr_lines: p.lines,
          question_label: label,
        })
      }
    } else {
      for (let i = 0; i < pageFiles.length; i++) {
        const file = pageFiles[i]
        const buf = Buffer.from(await file.arrayBuffer())
        const { full_text, lines } = await ocrAnswerBufferWithBoxes(
          buf,
          file.type || 'image/jpeg',
          subjectCode
        )
        const override = pageAssignments.find((a) => a.index === i)?.question_number
        const label =
          override || detectQuestionFromPageText(full_text)
        detectedLabels.push(label)
        const url = await uploadAnswerPhoto(
          buf,
          file.type || 'image/jpeg',
          userId
        )
        pagesOcr.push({
          photo_url: url || '',
          full_text,
          ocr_lines: lines,
          question_label: label,
        })
      }
    }

    const combinedOcr = pagesOcr
      .map((p, i) => {
        const label = p.question_label
        const header = label
          ? `[Page ${i + 1} — Question ${label}]\n`
          : `[Page ${i + 1}]\n`
        return header + p.full_text
      })
      .join('\n\n')

    if (!combinedOcr.trim() || combinedOcr.trim().length < 5) {
      return NextResponse.json(
        { error: 'No handwriting detected. Try clearer photos.' },
        { status: 400 }
      )
    }

    const segResponse = await withAnthropicRetry(
      () =>
        anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: buildWholePaperSegmentPrompt(combinedOcr),
            },
          ],
        }),
      { label: 'claude-whole-paper-segment' }
    )
    const segText =
      segResponse.content[0].type === 'text' ? segResponse.content[0].text : ''
    const segments = parseWholePaperSegment(segText)

    if (!segments || segments.questions.length === 0) {
      return NextResponse.json(
        {
          error:
            'Could not segment your paper into questions. Try clearer photos or assign questions manually.',
        },
        { status: 400 }
      )
    }

    const questionCount = Math.min(segments.questions.length, 15)
    const estSeconds = estimateMarkingSeconds(questionCount)
    const enrichedSegments = enrichSegmentsWithPages(
      segments.questions.slice(0, 15),
      pagesOcr
    )
    const pagePhotoUrls = pagesOcr.map((p) => p.photo_url)

    const jobState: WholePaperJobState = {
      phase: 'queued',
      message: 'Ready to mark your paper',
      questions_total: questionCount,
      questions_completed: 0,
      estimated_seconds_remaining: estSeconds,
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
      page_photo_urls: pagePhotoUrls,
      pages_ocr: pagesOcr,
      segmented_questions: enrichedSegments,
      partial_questions: [],
    }

    const { data: attempt, error: insertError } = await supabaseAdmin
      .from('attempts')
      .insert({
        mark_scheme_id: null,
        source_type: 'past_paper',
        user_id: userId,
        question_text: `Whole paper: ${manualPaperCode} ${manualPaperSession}`,
        ocr_text: combinedOcr,
        ai_marking: jobState,
        marks_earned: 0,
        total_marks: 0,
        syllabus_tags: [],
        time_spent_seconds: 0,
        answer_photo_url: pagePhotoUrls[0] || null,
        error_classifications: [],
        line_references: [],
      })
      .select('id')
      .single()

    if (insertError || !attempt?.id) {
      console.error('whole-paper init insert error:', insertError)
      return NextResponse.json(
        { error: 'Could not start marking job.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      attempt_id: attempt.id,
      page_count: pagesOcr.length,
      question_count: questionCount,
      detected_labels: detectedLabels,
      estimated_time: formatEstimatedTime(estSeconds),
      estimated_seconds: estSeconds,
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
    })
  } catch (err) {
    console.error('whole-paper init error:', err)
    return NextResponse.json(
      { error: 'Failed to prepare your paper for marking.' },
      { status: 500 }
    )
  }
}
