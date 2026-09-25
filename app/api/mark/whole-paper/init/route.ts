import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRouteRequest,
  warnIfAuthDropped,
} from '@/lib/supabase-server'
import {
  buildWholePaperSegmentPrompt,
  mergeSegmentations,
  parseWholePaperSegment,
  type SegmentedQuestion,
} from '@/lib/marking/whole-paper'
import {
  ocrAnswerBufferWithBoxes,
  supabaseAdmin,
  uploadAnswerPhoto,
} from '@/lib/marking/mark-runner'
import {
  generateGeminiText,
  generateGeminiTextWithMeta,
} from '@/lib/ai/gemini-text'
import {
  enrichSegmentsWithPages,
  segmentQuestionsByPageLabels,
  type StoredPageOcr,
} from '@/lib/marking/whole-paper-pages'
import {
  computeAllowance,
  allowanceForResponse,
  quotaExceededBody,
} from '@/lib/billing/enforcement'
import {
  clientIp,
  consumeAnonymousMarkSlot,
  refundAnonymousMarkSlot,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'
import {
  isRequestDeadlineError,
  withRequestDeadline,
} from '@/lib/ai/request-deadline'
import {
  classifyMarkingError,
  isUploadDecidedFailure,
} from '@/lib/marking/classify-marking-error'
import { wholePaperQuestionLimit, hasPriorityMarking } from '@/lib/billing/features'
import type { EffectiveAccess } from '@/lib/billing/access'
import { ocrPdfToPages } from '@/lib/marking/pdf-pages'
import { detectQuestionFromPageText } from '@/lib/marking/page-detection'
import type { WholePaperJobState } from '@/lib/marking/whole-paper-shared'
import {
  estimateMarkingSeconds,
  formatEstimatedTime,
} from '@/lib/marking/whole-paper'
import { dropDuplicateAdjacentPages } from '@/lib/marking/dedupe-pages'
import {
  applyPageOrder,
  buildPageOrderPrompt,
  describePageOrder,
  isUploadOrder,
  parsePageOrder,
  shouldCheckPageOrder,
} from '@/lib/marking/page-order'
import {
  MAX_WHOLE_PAPER_PAGES,
  WHOLE_PAPER_OCR_CONCURRENCY,
  collectPageUploads,
  isPdfUpload,
  mapWithConcurrency,
  readPageTolerantly,
  resolvePageUploadType,
  type WholePaperImageType,
} from '@/lib/marking/whole-paper-upload'

// OCR + segmentation of a full paper can be heavy; match the marking routes.
// vercel.json lists only run/process, so this export is what applies here.
export const maxDuration = 800

/**
 * Same wall-clock budget as whole-paper/run and mark/process. Init spends a
 * Gemini OCR call per page plus a segmentation call, so it is a long request
 * with retry loops under it and no reason to be the one route that gets killed
 * abruptly instead of failing cleanly.
 */
const INIT_BUDGET_RESERVE_MS = 20_000
const INIT_BUDGET_MS = maxDuration * 1000 - INIT_BUDGET_RESERVE_MS

/**
 * Segmentation must echo every answer's text back. At the old 4000-token cap
 * a dense 12–15 question paper overran it routinely, and the cut-off JSON was
 * repaired into a shorter list with no sign anything was missing. 8192 is
 * Flash's comfortable ceiling for this shape; the truncation check below is
 * what actually guarantees nothing is dropped.
 */
const SEGMENT_MAX_OUTPUT_TOKENS = 8192

type PageAssignment = { index: number; question_number: string | null }

/** A page after OCR, before dedupe and ordering. */
type ReadPage = StoredPageOcr & { read_failed?: boolean }

export async function POST(request: NextRequest) {
  return withRequestDeadline(INIT_BUDGET_MS, () => handleInit(request))
}

async function handleInit(request: NextRequest) {
  // The guest's one-a-day slot, taken once the upload has passed validation
  // and given back on OUR failures after that (OCR outage on every page,
  // insert error, deadline). Function scope so the catch can refund it;
  // without the refund our own outage cost the guest their day's mark.
  //
  // NOT given back on outcomes the upload decided — no handwriting, nothing
  // to segment. By then a Flash OCR call per page (up to twenty), a Pro
  // escalation for every page that read as illegible (a blank or noise
  // image triggers exactly that) and the segmentation call have all been
  // spent. Refunding those let one IP POST twenty blank JPEGs in a loop for
  // free, forever: the 1/day cap never bound on the expensive failure path
  // (code review 2026-09-25, §1.7 reopened).
  let guestSlotHeld = false
  let ip = 'unknown'
  let userId: string | null = null
  const refundGuestSlot = async () => {
    if (!guestSlotHeld) return
    guestSlotHeld = false
    await refundAnonymousMarkSlot(supabaseAdmin, ip, userId)
  }

  try {
    // Read auth from request.cookies (+ bearer) — cookies() from next/headers
    // can come back empty on this streaming multipart POST, which silently
    // saved logged-in users' whole-paper attempts with user_id = null.
    const { user } = await authenticateRouteRequest(request)
    userId = user?.id || null
    warnIfAuthDropped(request, userId, 'mark/whole-paper/init')
    ip = clientIp(request)

    let allowance: Awaited<ReturnType<typeof computeAllowance>> | null = null
    // Whole-paper question limit and priority key off the allowance's
    // resolved `access` — subscription, verified teacher seat and comp
    // together. Recomputing from a `user_subscriptions` read here gave a
    // verified teacher (no subscription row) the 3-question free preview.
    let access: EffectiveAccess = 'free'
    if (userId) {
      allowance = await computeAllowance(userId)
      if (allowance.blocked_by_mode) {
        return NextResponse.json(quotaExceededBody(allowance), { status: 402 })
      }
      access = allowance.access
    }

    const questionLimit = wholePaperQuestionLimit(access)

    const formData = await request.formData()
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const assignmentsRaw = formData.get('page_assignments') as string | null

    let pageAssignments: PageAssignment[] = []
    if (assignmentsRaw) {
      try {
        const parsed = JSON.parse(assignmentsRaw)
        if (Array.isArray(parsed)) pageAssignments = parsed as PageAssignment[]
      } catch {
        pageAssignments = []
      }
    }
    const assignedQuestion = (clientIndex: number): string | null =>
      pageAssignments.find((a) => a?.index === clientIndex)?.question_number || null

    if (!manualPaperCode || !manualPaperSession) {
      return NextResponse.json(
        {
          error:
            'Select subject, year, session, and paper for whole-paper marking.',
        },
        { status: 400 }
      )
    }

    // ---- Validate the upload before anything is spent ----------------------
    //
    // Files are read here rather than at OCR time so the type check sees the
    // bytes. `file.type` was previously forwarded unchecked into Gemini and
    // into storage as the object's content type.
    const { pages: pageUploads } = collectPageUploads(formData.entries())
    const pdfField = formData.get('pdf')
    const pdfFile = pdfField instanceof File && pdfField.size > 0 ? pdfField : null

    if (!pdfFile && pageUploads.length === 0) {
      return NextResponse.json(
        { error: 'Upload at least one page image or a PDF.' },
        { status: 400 }
      )
    }
    if (pageUploads.length > MAX_WHOLE_PAPER_PAGES) {
      return NextResponse.json(
        {
          error: `Upload at most ${MAX_WHOLE_PAPER_PAGES} pages at a time. Split a longer paper into two uploads.`,
        },
        { status: 400 }
      )
    }

    let pdfBytes: ArrayBuffer | null = null
    const photoPages: Array<{
      clientIndex: number
      buf: Buffer
      type: WholePaperImageType
    }> = []

    if (pdfFile) {
      pdfBytes = await pdfFile.arrayBuffer()
      if (!isPdfUpload(new Uint8Array(pdfBytes))) {
        return NextResponse.json(
          { error: 'That file is not a PDF. Upload a PDF scan, or page photos instead.' },
          { status: 400 }
        )
      }
    } else {
      for (const upload of pageUploads) {
        const buf = Buffer.from(await upload.file.arrayBuffer())
        const type = resolvePageUploadType(upload.file.type, buf)
        if (!type) {
          return NextResponse.json(
            {
              error: `Page ${upload.clientIndex + 1} is not a JPEG, PNG, WebP or HEIC image. Re-take or re-export it and try again.`,
            },
            { status: 400 }
          )
        }
        photoPages.push({ clientIndex: upload.clientIndex, buf, type })
      }
    }

    // ---- Validation passed: consume the guest slot, then spend ---------------
    //
    // This route was checking the cap and never incrementing it, while
    // whole-paper/run incremented it and never enforced it — and only after the
    // paper had already been marked. So the two halves of one limit never met:
    // a guest could call init N times (the counter stayed at 0, so every call
    // passed), collect N attempt ids, and run them all. ANON_DAILY_MARK_LIMIT = 1
    // was unbounded in practice.
    //
    // Init is the right place to charge because init is where the money goes: a
    // Gemini OCR call per page plus a segmentation call, all before run() is
    // ever reached. A guest who inits and abandons has still spent that.
    //
    // Consumed AFTER validation (a guest who sent an unsupported file used to
    // lose the day's one mark to a 400) and atomically — the RPC increments-
    // or-refuses in one statement, so N parallel guest uploads from one IP no
    // longer all pass. Refunded on every failure below (refundGuestSlot).
    const slot = await consumeAnonymousMarkSlot(supabaseAdmin, ip, userId)
    if (!slot.allowed) {
      return rateLimitJson(slot.message)
    }
    guestSlotHeld = !userId

    const subjectCode = manualPaperCode.split('/')[0]
    const warnings: string[] = []
    let readPages: ReadPage[] = []

    if (pdfBytes) {
      // One page at a time, four in flight — the same read a photographed page
      // gets, including the Flash→Pro escalation for an unreadable read. This
      // route was the last caller still passing no `ocrPage`, which meant the
      // whole-document read that #119 retired: one giant call, no page cap,
      // and 16 of 28 PDF uploads failing in the 30 days to 2026-09-24.
      const failedPdfPages = new Set<number>()
      const pdfPages = await ocrPdfToPages(pdfBytes, {
        ocrPage: async (bytes, pageNumber) => {
          const read = await readPageTolerantly(() =>
            ocrAnswerBufferWithBoxes(Buffer.from(bytes), 'application/pdf', subjectCode)
          )
          if (read.ok) return read.value
          console.warn(`[whole-paper/init] pdf page ${pageNumber} failed OCR`, read.error)
          failedPdfPages.add(pageNumber)
          warnings.push(
            `Page ${pageNumber} of the PDF could not be read and was left blank.`
          )
          return { full_text: '', lines: [] }
        },
        maxPages: MAX_WHOLE_PAPER_PAGES,
        concurrency: WHOLE_PAPER_OCR_CONCURRENCY,
        onPageCount: (total, read) => {
          if (total > read) {
            warnings.push(
              `The PDF has ${total} pages; only the first ${read} were read. Split a longer paper into two uploads.`
            )
          }
        },
      })
      readPages = pdfPages.map((p, i) => ({
        photo_url: '',
        full_text: p.full_text,
        ocr_lines: p.lines,
        question_label:
          assignedQuestion(i) || detectQuestionFromPageText(p.full_text),
        read_failed: failedPdfPages.has(i + 1),
      }))
    } else {
      // Bounded concurrency, per-page tolerance. This was sequential with a
      // single try/catch around all of it: page 7 of 12 failing meant a 500,
      // twelve pages of OCR spend gone and — for a guest — the day's slot gone
      // with it.
      readPages = await mapWithConcurrency(
        photoPages,
        WHOLE_PAPER_OCR_CONCURRENCY,
        async ({ clientIndex, buf, type }) => {
          const [read, photoUrl] = await Promise.all([
            readPageTolerantly(() => ocrAnswerBufferWithBoxes(buf, type, subjectCode)),
            uploadAnswerPhoto(buf, type, userId),
          ])
          if (!read.ok) {
            console.warn(`[whole-paper/init] page ${clientIndex + 1} failed OCR`, read.error)
            warnings.push(`Page ${clientIndex + 1} could not be read and was left blank.`)
          }
          const { full_text, lines } = read.ok ? read.value : { full_text: '', lines: [] }
          return {
            photo_url: photoUrl || '',
            full_text,
            ocr_lines: lines,
            // The student's own assignment for this page wins; it is looked up
            // by the CLIENT index so a skipped empty file cannot shift it.
            question_label:
              assignedQuestion(clientIndex) || detectQuestionFromPageText(full_text),
            read_failed: !read.ok,
          }
        }
      )
    }

    // Every page failing is our outage, not the student's handwriting — say so
    // and let them retry, rather than "no handwriting detected".
    if (readPages.length > 0 && readPages.every((p) => p.read_failed)) {
      await refundGuestSlot()
      return NextResponse.json(
        {
          error:
            "We couldn't read your pages just now. Nothing was marked — please try again in a minute.",
          retryable: true,
        },
        { status: 503 }
      )
    }

    // Drop adjacent near-duplicate pages (the same sheet photographed twice) so
    // the same answer is not segmented, marked and billed twice.
    const deduped = dropDuplicateAdjacentPages(readPages, (i, sim) => {
      console.warn(
        `[whole-paper/init] dropped duplicate page ${i + 1} (similarity ${sim.toFixed(2)})`
      )
      warnings.push(
        `Page ${i + 1} looked like a repeat of the page before it and was skipped.`
      )
    })

    // Read the pages in the order they were WRITTEN, not photographed — the
    // same check the single-question path runs (see lib/marking/page-order.ts
    // for the 1/12 → 8/12 diary entry). Bounded: only when every page is
    // substantial, one small call, and any failure keeps the upload order.
    // Labels travel with their page, so reordering here needs no remapping of
    // page_assignments.
    let ordered = deduped
    const texts = deduped.map((p) => p.full_text)
    if (shouldCheckPageOrder(texts)) {
      try {
        const raw = await generateGeminiText(buildPageOrderPrompt(texts), {
          task: 'structured-extraction',
          // "[1,2,…,20]" is ~60 tokens; leave room.
          maxOutputTokens: 128,
        })
        const order = parsePageOrder(raw, deduped.length)
        if (order && !isUploadOrder(order)) {
          ordered = applyPageOrder([...deduped], order)
          console.warn(
            `[whole-paper/init] pages read out of order; reading as ${describePageOrder(order)}`
          )
          warnings.push(
            `Your pages were read in the order ${describePageOrder(order)}, following the writing.`
          )
        }
      } catch (err) {
        if (isRequestDeadlineError(err)) throw err
        console.warn('[whole-paper/init] page-order check failed; keeping upload order', err)
      }
    }

    const pagesOcr: StoredPageOcr[] = ordered.map((p) => ({
      photo_url: p.photo_url,
      full_text: p.full_text,
      ocr_lines: p.ocr_lines,
      question_label: p.question_label,
    }))
    const detectedLabels = pagesOcr.map((p) => p.question_label)

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
      // No refund: every page has been through OCR (and Pro escalation where
      // the read looked illegible). The upload decided this, not us.
      return NextResponse.json(
        { error: 'No handwriting detected. Try clearer photos.' },
        { status: 400 }
      )
    }

    const segText = await generateGeminiTextWithMeta(
      buildWholePaperSegmentPrompt(combinedOcr),
      { task: 'structured-extraction', maxOutputTokens: SEGMENT_MAX_OUTPUT_TOKENS }
    )
    const segmentation = parseWholePaperSegment(segText.text, {
      finishReason: segText.finishReason,
    })

    // A cut-off segmentation is repaired into a shorter valid list, so a paper
    // silently lost its last questions. Pages are the one thing known to be
    // complete: fill in whatever the model never reached from the page labels.
    let questions: SegmentedQuestion[] = segmentation?.questions ?? []
    if (!segmentation || segmentation.truncated) {
      const byPages = segmentQuestionsByPageLabels(pagesOcr)
      const before = questions.length
      questions = mergeSegmentations(questions, byPages)
      console.warn(
        `[whole-paper/init] segmentation ${segmentation ? 'truncated' : 'unparseable'}; page labels added ${questions.length - before} question(s)`
      )
      if (segmentation?.truncated && questions.length === before) {
        warnings.push(
          'This paper was too long to split fully and some questions may be missing. Labelling each page with its question number helps.'
        )
      }
    }

    if (questions.length === 0) {
      // No refund, for the same reason: OCR and segmentation are spent, and
      // what they found is a property of the upload.
      return NextResponse.json(
        {
          error:
            'Could not segment your paper into questions. Try clearer photos or assign questions manually.',
        },
        { status: 400 }
      )
    }

    // Free preview: mark the first `questionLimit`, remember the REST by number
    // only. run() turns them into 'not_marked_preview' rows so the result says
    // "N more are marked on Scholar" rather than "Not attempted" — and holds no
    // text a per-question retry could mark for free.
    const toMark = questions.slice(0, questionLimit)
    const previewCut = questions.slice(questionLimit).map((q) => q.question_number)
    const questionCount = toMark.length
    const estSeconds = estimateMarkingSeconds(questionCount)
    const enrichedSegments = enrichSegmentsWithPages(toMark, pagesOcr)
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
      priority: hasPriorityMarking(access) ? 'max' : 'standard',
      has_pdf: !!pdfBytes,
      warnings: warnings.length ? warnings : undefined,
      questions_in_paper: questions.length,
      question_limit: questionLimit,
      preview_cut_questions: previewCut.length ? previewCut : undefined,
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
      await refundGuestSlot()
      return NextResponse.json(
        { error: 'Could not start marking job.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      attempt_id: attempt.id,
      page_count: pagesOcr.length,
      question_count: questionCount,
      questions_in_paper: questions.length,
      question_limit: questionLimit,
      preview_mode: access === 'free',
      detected_labels: detectedLabels,
      warnings,
      estimated_time: formatEstimatedTime(estSeconds),
      estimated_seconds: estSeconds,
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
      _allowance: allowance ? allowanceForResponse(allowance) : undefined,
    })
  } catch (err) {
    console.error('whole-paper init error:', err)
    // Infrastructure failures (deadline, model outage, DB) give the slot
    // back; a thrown upload fault — the marker's own "no handwriting" or
    // "add the question" — keeps it, like the explicit returns above.
    if (!isUploadDecidedFailure(classifyMarkingError(err).code)) {
      await refundGuestSlot()
    }
    if (isRequestDeadlineError(err)) {
      return NextResponse.json(
        {
          error: 'Reading your paper took too long. Nothing was marked — please try again.',
          retryable: true,
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to prepare your paper for marking.' },
      { status: 500 }
    )
  }
}
