'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WholePaperUploadSection, type WholePaperPage } from './WholePaperUploadSection'
import { WholePaperMarkingProgress } from './WholePaperMarkingProgress'
import { WholePaperResultView } from '@/components/WholePaperResultView'
import type { WholePaperResult } from '@/lib/marking/types'

type Props = {
  paperCode: string
  paperSession: string
  questionOptions: string[]
  onError: (msg: string, retryable?: boolean) => void
  onReset: () => void
}

type JobStatus = {
  phase: string
  message: string
  questions_total: number
  questions_completed: number
  estimated_seconds_remaining?: number
  result?: WholePaperResult
}

export function WholePaperFlow({
  paperCode,
  paperSession,
  questionOptions,
  onError,
  onReset,
}: Props) {
  const [phase, setPhase] = useState<'upload' | 'marking' | 'result'>('upload')
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
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
            onError(data.error || 'Marking failed.')
            setPhase('upload')
          }
        } catch {
          // keep polling
        }
      }, 2000)
    },
    [onError, stopPolling]
  )

  const handleSubmit = async (pages: WholePaperPage[], pdf: File | null) => {
    onError('')
    setPhase('marking')
    setJobStatus({
      phase: 'ocr',
      message: 'Extracting text from your work…',
      questions_total: 0,
      questions_completed: 0,
    })

    try {
      const formData = new FormData()
      formData.append('manual_paper_code', paperCode)
      formData.append('manual_paper_session', paperSession)
      formData.append(
        'page_assignments',
        JSON.stringify(
          pages.map((p, index) => ({
            index,
            question_number: p.manualQuestion ?? p.detectedQuestion,
          }))
        )
      )
      if (pdf) {
        formData.append('pdf', pdf)
      } else {
        pages.forEach((p, i) => {
          formData.append(`pages[${i}]`, p.file)
        })
      }

      const initRes = await fetch('/api/mark/whole-paper/init', {
        method: 'POST',
        body: formData,
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        onError(initData.error || 'Failed to start marking.')
        setPhase('upload')
        return
      }

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

      fetch('/api/mark/whole-paper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: id }),
      })
        .then(async (runRes) => {
          const runData = await runRes.json()
          if (!runRes.ok) {
            stopPolling()
            onError(runData.error || 'Marking failed.')
            setPhase('upload')
            return
          }
          if (runData.whole_paper) {
            stopPolling()
            setResult(runData.whole_paper as WholePaperResult)
            setAnswerPhotoUrl(runData.answer_photo_url ?? null)
            setPhase('result')
          }
        })
        .catch(() => {
          // polling will surface completion or failure
        })
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

  if (phase === 'marking' && jobStatus) {
    return (
      <WholePaperMarkingProgress
        phase={jobStatus.phase}
        message={jobStatus.message}
        questionsCompleted={jobStatus.questions_completed}
        questionsTotal={jobStatus.questions_total}
        estimatedSecondsRemaining={jobStatus.estimated_seconds_remaining}
      />
    )
  }

  return (
    <WholePaperUploadSection
      questionOptions={questionOptions}
      detectedQuestionCount={questionOptions.length}
      onCancel={onReset}
      onSubmit={handleSubmit}
    />
  )
}
