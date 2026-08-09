'use client'

import { useCallback, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { UploadPage } from '@/components/upload/PageUploader'
import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'
import { DraftGuard } from './DraftGuard'
import { CaptureScreen } from './screens/CaptureScreen'
import { ConfirmScreen } from './screens/ConfirmScreen'
import {
  createInitialContext,
  markFlowReducer,
} from './mark-flow-machine'
import type { MarkFlowDraft, MarkScope } from './types'

export type MarkFlowSubmitPayload = {
  draft: MarkFlowDraft
  pages: UploadPage[]
  pdfFile: File | null
  typedAnswer: string
  questionText: string
  questionPhoto: File | null
}

type SubjectOption = { code: string; label: string }

type Props = {
  board: MarkExamBoard
  subjectCode: string | null
  subjectOptions: SubjectOption[]
  /** Host owns marking overlay + result; called after Confirm. */
  onSubmit: (payload: MarkFlowSubmitPayload) => void | Promise<void>
  /** When host is mid-request after confirm. */
  submitting?: boolean
  submitError?: string | null
  /** Rendered when machine is in marking/result — host UI. */
  hostSlot?: ReactNode
}

function canContinue(
  draft: MarkFlowDraft,
  pages: UploadPage[],
  pdf: File | null,
  questionPhoto: File | null
) {
  if (draft.scope === 'whole_paper') {
    return (
      (pages.length > 0 || !!pdf) &&
      !!draft.paperCode?.trim() &&
      !!draft.paperSession?.trim()
    )
  }
  const hasQuestion =
    draft.questionText.trim().length >= 10 || !!questionPhoto
  if (!hasQuestion) return false
  if (draft.inputKind === 'typed') return draft.typedAnswer.trim().length > 0
  return pages.length > 0 || !!pdf
}

/**
 * Mark task host — Capture / Confirm owned here; Marking / Result via hostSlot (R1).
 */
export function MarkFlow({
  board,
  subjectCode,
  subjectOptions,
  onSubmit,
  submitting = false,
  submitError = null,
  hostSlot,
}: Props) {
  const [ctx, dispatch] = useReducer(
    markFlowReducer,
    undefined,
    () =>
      createInitialContext({
        board,
        subjectCode,
        scope: 'one_answer' as MarkScope,
      })
  )
  const [pages, setPages] = useState<UploadPage[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [questionPhoto, setQuestionPhoto] = useState<File | null>(null)

  const patchDraft = useCallback((patch: Partial<MarkFlowDraft>) => {
    dispatch({ type: 'PATCH_DRAFT', patch })
  }, [])

  const onPagesChange = useCallback(
    (next: UploadPage[] | ((prev: UploadPage[]) => UploadPage[])) => {
      setPages((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        dispatch({
          type: 'PATCH_DRAFT',
          patch: {
            pageCount: resolved.length,
            inputKind: resolved.length
              ? pdfFile
                ? 'pdf'
                : 'photos'
              : ctx.draft.inputKind === 'typed'
                ? 'typed'
                : null,
          },
        })
        return resolved
      })
    },
    [ctx.draft.inputKind, pdfFile]
  )

  const onPdfChange = useCallback((file: File | null) => {
    setPdfFile(file)
    dispatch({
      type: 'PATCH_DRAFT',
      patch: {
        inputKind: file ? 'pdf' : pages.length ? 'photos' : null,
        pageCount: file ? Math.max(pages.length, 1) : pages.length,
      },
    })
  }, [pages.length])

  const onQuestionPhotoChange = useCallback((file: File | null) => {
    setQuestionPhoto(file)
    dispatch({
      type: 'PATCH_DRAFT',
      patch: { hasQuestionPhoto: !!file },
    })
  }, [])

  const ready = useMemo(
    () => canContinue(ctx.draft, pages, pdfFile, questionPhoto),
    [ctx.draft, pages, pdfFile, questionPhoto]
  )

  if (ctx.state === 'marking' || ctx.state === 'result') {
    return <>{hostSlot}</>
  }

  return (
    <div className="ms-mark-flow">
      <DraftGuard dirty={ctx.draft.dirty && ctx.state === 'capture'} />

      {ctx.state === 'capture' ? (
        <CaptureScreen
          draft={ctx.draft}
          pages={pages}
          pdfFile={pdfFile}
          questionPhoto={questionPhoto}
          subjectOptions={subjectOptions}
          onPatchDraft={patchDraft}
          onPagesChange={onPagesChange}
          onPdfChange={onPdfChange}
          onQuestionPhotoChange={onQuestionPhotoChange}
          canContinue={ready}
          onContinue={() => dispatch({ type: 'CONTINUE_TO_CONFIRM' })}
        />
      ) : null}

      {ctx.state === 'confirm' ? (
        <ConfirmScreen
          draft={ctx.draft}
          error={submitError || ctx.error}
          submitting={submitting}
          onBack={() => dispatch({ type: 'BACK_TO_CAPTURE' })}
          onConfirm={() => {
            // Stay on confirm until the host mounts the wait/result UI
            // (loading / cinematic). START_MARKING is reserved for host-driven handoff.
            void Promise.resolve(
              onSubmit({
                draft: ctx.draft,
                pages,
                pdfFile,
                typedAnswer: ctx.draft.typedAnswer,
                questionText: ctx.draft.questionText,
                questionPhoto,
              })
            ).catch(() => {
              dispatch({
                type: 'MARKING_FAILED',
                error: 'Could not start marking. Try again.',
              })
            })
          }}
        />
      ) : null}
    </div>
  )
}
