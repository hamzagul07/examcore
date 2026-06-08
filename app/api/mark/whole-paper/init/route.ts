import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import {
  buildWholePaperSegmentPrompt,
  parseWholePaperSegment,
} from '@/lib/marking/whole-paper'
import {
  ocrAnswerBufferWithBoxes,
  supabaseAdmin,
  uploadAnswerPhoto,
} from '@/lib/marking/mark-runner'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import {
  enrichSegmentsWithPages,
  type StoredPageOcr,
} from '@/lib/marking/whole-paper-pages'
import {
  checkMarkAllowance,
  allowanceForResponse,
  quotaExceededBody,
} from '@/lib/billing/enforcement'
import {
  checkAnonymousMarkRateLimit,
  clientIp,
  incrementAnonymousMarkRateLimit,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'
import { createServiceClient } from '@/lib/supabase/service'
import { wholePaperQuestionLimit } from '@/lib/billing/features'
import type { SubscriptionTier } from '@/lib/database.types'
import { ocrPdfToPages } from '@/lib/marking/pdf-pages'
import { getMarkingGenAI } from '@/lib/marking/mark-runner'
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
    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    const userId = user?.id || null

    const ip = clientIp(request)
    const rateCheck = await checkAnonymousMarkRateLimit(supabaseAdmin, ip, userId)
    if (!rateCheck.allowed) {
      return rateLimitJson(rateCheck.message)
    }

    let allowance: Awaited<ReturnType<typeof checkMarkAllowance>> | null = null
    let tier: SubscriptionTier = 'free'
    if (userId) {
      const service = createServiceClient()
      const { data: subRow } = await service
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', userId)
        .maybeSingle()
      tier = (subRow?.tier ?? 'free') as SubscriptionTier

      allowance = await checkMarkAllowance(userId)
      if (allowance.blocked_by_mode) {
        return NextResponse.json(quotaExceededBody(allowance), { status: 402 })
      }
    }

    const questionLimit = wholePaperQuestionLimit(tier)

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
      const pages = await ocrPdfToPages(pdfBytes, getMarkingGenAI())
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

    const segText = await generateGeminiText(
      buildWholePaperSegmentPrompt(combinedOcr),
      { task: 'structured-extraction', maxOutputTokens: 4000 }
    )
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

    const questionCount = Math.min(segments.questions.length, questionLimit)
    const estSeconds = estimateMarkingSeconds(questionCount)
    const enrichedSegments = enrichSegmentsWithPages(
      segments.questions.slice(0, questionLimit),
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
      questions_in_paper: segments.questions.length,
      question_limit: questionLimit,
      preview_mode: tier === 'free',
      detected_labels: detectedLabels,
      estimated_time: formatEstimatedTime(estSeconds),
      estimated_seconds: estSeconds,
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
      _allowance: allowance ? allowanceForResponse(allowance) : undefined,
    })
  } catch (err) {
    console.error('whole-paper init error:', err)
    return NextResponse.json(
      { error: 'Failed to prepare your paper for marking.' },
      { status: 500 }
    )
  }
}
