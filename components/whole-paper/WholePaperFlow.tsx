'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WholePaperUploadSection, type WholePaperPage } from './WholePaperUploadSection'
import { WholePaperMarkingProgress } from './WholePaperMarkingProgress'
import { WholePaperResultView } from '@/components/WholePaperResultView'
import type { WholePaperLoadingContext, WholePaperResult } from '@/lib/marking/types'
import type { MarkContextPayload } from '@/lib/marking/mark-progress'
import { prepareWholePaperUpload } from '@/lib/upload/prepare-upload'
import type { AllowanceBlock, QuotaExceeded } from '@/lib/billing/client-types'

type Props = {
  paperCode: string
  paperSession: string
  questionOptions: string[]
  onError: (msg: string, retryable?: boolean) => void
  onReset: () => void
  onQuotaExceeded?: (data: QuotaExceeded) => void
  onAllowance?: (block: AllowanceBlock | undefined) => void
  onGuestRateLimit?: () => void
  disabled?: boolean
}

type JobStatus = {
  phase: string
  message: string
  questions_total: number
  questions_completed: number
  estimated_seconds_remaining?: number
  loading_context?: WholePaperLoadingContext
  result?: WholePaperResult
}

function toMarkContext(
  ctx: WholePaperLoadingContext | undefined,
  paperCode: string,
  paperSession: string
): MarkContextPayload | null {
  if (!ctx?.question_number) return null
  return {
    paper_code: ctx.paper_code ?? paperCode,
    paper_session: ctx.paper_session ?? paperSession,
    question_number: ctx.question_number,
    syllabus_tags: ctx.syllabus_tags ?? null,
  }
}

export function WholePaperFlow({
  paperCode,
  paperSession,
  questionOptions,
  onError,
  onReset,
  onQuotaExceeded,
  onAllowance,
  onGuestRateLimit,
  disabled,
}: Props) {
  const [phase, setPhase] = useState<'upload' | 'marking' | 'result'>('upload')
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [markingError, setMarkingError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [result, setResult] = useState<WholePaperResult | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [answerPhotoUrl, setAnswerPhotoUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const pollStatus = useCallback(
    (id: string) => {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/mark/whole-paper/status?attempt_id=${encodeURIComponent(id)}`
          )
          const data = await res.json()
          if (!res.ok) return
          setJobStatus({
            phase: data.phase,
            message: data.message,
            questions_total: data.questions_total ?? 0,
            questions_completed: data.questions_completed ?? 0,
            estimated_seconds_remaining: data.estimated_seconds_remaining,
            loading_context: data.loading_context,
            result: data.result,
          })
          if (data.phase === 'complete' && data.result) {
            stopPolling()
            setResult(data.result as WholePaperResult)
            setAnswerPhotoUrl(data.answer_photo_url ?? null)
            setPhase('result')
          }
          if (data.phase === 'failed') {
            stopPolling()
            setMarkingError(data.error || 'Marking failed.')
            setJobStatus((prev) => ({
              phase: 'failed',
              message: data.message || 'Marking failed',
              questions_total: data.questions_total ?? prev?.questions_total ?? 0,
              questions_completed:
                data.questions_completed ?? prev?.questions_completed ?? 0,
              loading_context: data.loading_context ?? prev?.loading_context,
            }))
          }
        } catch {
          // keep polling
        }
      }, 2000)
    },
    [stopPolling]
  )

  const runWholePaperMarking = useCallback(
    (id: string) => {
      fetch('/api/mark/whole-paper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: id }),
      })
        .then(async (runRes) => {
          const runData = await runRes.json()
          if (!runRes.ok) {
            stopPolling()
            setMarkingError(runData.error || 'Marking failed.')
            setJobStatus((prev) => ({
              phase: 'failed',
              message: 'Marking failed',
              questions_total: prev?.questions_total ?? 0,
              questions_completed: prev?.questions_completed ?? 0,
              loading_context: prev?.loading_context,
            }))
            setRetrying(false)
            return
          }
          if (runData.whole_paper) {
            stopPolling()
            setResult(runData.whole_paper as WholePaperResult)
            setAnswerPhotoUrl(runData.answer_photo_url ?? null)
            setPhase('result')
            setMarkingError(null)
            onAllowance?.(runData._allowance as AllowanceBlock | undefined)
          }
          setRetrying(false)
        })
        .catch(() => {
          setRetrying(false)
        })
    },
    [onAllowance, stopPolling]
  )

  const handleRetryMarking = useCallback(() => {
    if (!attemptId) return
    setMarkingError(null)
    setRetrying(true)
    setJobStatus((prev) => ({
      phase: 'marking',
      message: 'Retrying marking…',
      questions_total: prev?.questions_total ?? 0,
      questions_completed: prev?.questions_completed ?? 0,
      loading_context: prev?.loading_context,
    }))
    pollStatus(attemptId)
    runWholePaperMarking(attemptId)
  }, [attemptId, pollStatus, runWholePaperMarking])

  const handleBackToUpload = useCallback(() => {
    stopPolling()
    setMarkingError(null)
    setRetrying(false)
    setAttemptId(null)
    setJobStatus(null)
    setPhase('upload')
    onError('')
  }, [onError, stopPolling])

  const handleSubmit = async (pages: WholePaperPage[], pdf: File | null) => {
    onError('')
    setMarkingError(null)
    setPhase('marking')
    setJobStatus({
      phase: 'ocr',
      message: 'Extracting text from your work…',
      questions_total: 0,
      questions_completed: 0,
    })

    try {
      const prepared = await prepareWholePaperUpload(pages, pdf)
      if (prepared.error) {
        onError(prepared.error)
        setPhase('upload')
        return
      }

      const readyPages = prepared.pages
      const readyPdf = prepared.pdf

      const formData = new FormData()
      formData.append('manual_paper_code', paperCode)
      formData.append('manual_paper_session', paperSession)
      formData.append(
        'page_assignments',
        JSON.stringify(
          readyPages.map((p, index) => ({
            index,
            question_number: p.manualQuestion ?? p.detectedQuestion,
          }))
        )
      )
      if (readyPdf) {
        formData.append('pdf', readyPdf)
      } else {
        readyPages.forEach((p, i) => {
          formData.append(`pages[${i}]`, p.file)
        })
      }

      const initRes = await fetch('/api/mark/whole-paper/init', {
        method: 'POST',
        body: formData,
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        if (initRes.status === 429) {
          onGuestRateLimit?.()
          onError(initData.error || 'Daily guest limit reached.')
          setPhase('upload')
          return
        }
        // Cap breach (enforce mode only) — surface the upgrade modal, not an error.
        if (initData?.error === 'mark_quota_exceeded') {
          onQuotaExceeded?.(initData as QuotaExceeded)
          setPhase('upload')
          return
        }
        onError(initData.error || 'Failed to start marking.')
        setPhase('upload')
        return
      }

      if (initData._allowance) onAllowance?.(initData._allowance as AllowanceBlock)

      const id = initData.attempt_id as string
      setAttemptId(id)
      setJobStatus({
        phase: 'marking',
        message: 'Starting marking…',
        questions_total: initData.question_count ?? 0,
        questions_completed: 0,
        estimated_seconds_remaining: initData.estimated_seconds,
      })

      pollStatus(id)
      runWholePaperMarking(id)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Network error')
      setPhase('upload')
    }
  }

  const handleRetryQuestion = async (questionNumber: string) => {
    if (!attemptId || !result) return
    const res = await fetch('/api/mark/whole-paper/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt_id: attemptId, question_number: questionNumber }),
    })
    const data = await res.json()
    if (!res.ok) {
      onError(data.error || 'Retry failed.')
      return
    }
    setResult(data.whole_paper as WholePaperResult)
  }

  if (phase === 'result' && result) {
    return (
      <div className="space-y-8">
        <WholePaperResultView
          result={result}
          attemptId={attemptId}
          answerPhotoUrl={answerPhotoUrl}
          onRetryQuestion={handleRetryQuestion}
        />
        <button
          type="button"
          onClick={onReset}
          className="ec-btn-primary w-full justify-center text-base"
          style={{ padding: '16px 24px' }}
        >
          Mark another paper
        </button>
      </div>
    )
  }

  if (phase === 'marking' && (jobStatus || markingError)) {
    return (
      <WholePaperMarkingProgress
        phase={jobStatus?.phase ?? 'marking'}
        message={jobStatus?.message ?? 'Marking your paper…'}
        questionsCompleted={jobStatus?.questions_completed ?? 0}
        questionsTotal={jobStatus?.questions_total ?? 0}
        paperCode={paperCode}
        paperSession={paperSession}
        context={toMarkContext(jobStatus?.loading_context, paperCode, paperSession)}
        error={markingError}
        onRetry={markingError && attemptId ? handleRetryMarking : undefined}
        onBackToUpload={markingError ? handleBackToUpload : undefined}
        retryDisabled={retrying}
      />
    )
  }

  return (
    <WholePaperUploadSection
      questionOptions={questionOptions}
      detectedQuestionCount={questionOptions.length}
      onCancel={onReset}
      onSubmit={handleSubmit}
      disabled={disabled}
    />
  )
}
