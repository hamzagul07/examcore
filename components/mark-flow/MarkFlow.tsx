'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import type { UploadPage } from '@/components/upload/PageUploader'
import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'
import { DraftGuard } from './DraftGuard'
import {
  CaptureScreen,
  type PastPaperCatalogProps,
} from './screens/CaptureScreen'
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

export type MarkFlowHandle = {
  /** Host cancelled wait — return to Confirm with draft intact. */
  cancelMarking: () => void
  /** Host revealed the mark result — advance machine to result. */
  markingDone: () => void
  /** Clear local files + draft and return to Capture. */
  markAnother: () => void
}

type SubjectOption = { code: string; label: string }

type Props = {
  board: MarkExamBoard
  subjectCode: string | null
  subjectOptions: SubjectOption[]
  /** Cambridge past-paper catalog for Capture (optional). */
  pastPaperCatalog?: PastPaperCatalogProps | null
  onSubmit: (payload: MarkFlowSubmitPayload) => void | Promise<void>
  submitting?: boolean
  submitError?: string | null
  /** Rendered while machine is in marking/result (host wait / result UI). */
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
  if (draft.questionSource === 'past_paper') {
    const hasPaper =
      !!draft.paperCode?.trim() &&
      !!draft.paperSession?.trim() &&
      !!draft.questionNumber?.trim()
    if (!hasPaper) return false
  } else if (draft.practiceKind === 'combined_script') {
    if (!draft.subjectCode?.trim()) return false
    // Typed-only has no page to recover the printed question from.
    if (draft.inputKind === 'typed') return false
    return pages.length > 0 || !!pdf
  } else {
    if (!draft.subjectCode?.trim()) return false
    const hasQuestion =
      draft.questionText.trim().length >= 10 || !!questionPhoto
    if (!hasQuestion) return false
  }
  if (draft.inputKind === 'typed') return draft.typedAnswer.trim().length > 0
  return pages.length > 0 || !!pdf
}

/**
 * Mark task host — Capture / Confirm owned here; Marking / Result via hostSlot (R1).
 * Stay mounted across wait so Cancel restores Confirm with the same draft.
 */
export const MarkFlow = forwardRef<MarkFlowHandle, Props>(function MarkFlow(
  {
    board,
    subjectCode,
    subjectOptions,
    pastPaperCatalog = null,
    onSubmit,
    submitting = false,
    submitError = null,
    hostSlot,
  },
  ref
) {
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

  useImperativeHandle(
    ref,
    () => ({
      cancelMarking: () => dispatch({ type: 'CANCEL_MARKING' }),
      markingDone: () => dispatch({ type: 'MARKING_DONE' }),
      markAnother: () => {
        setPages([])
        setPdfFile(null)
        setQuestionPhoto(null)
        dispatch({ type: 'MARK_ANOTHER' })
      },
    }),
    []
  )

  // Seed board/subject from the host when the draft has not chosen them yet.
  useEffect(() => {
    const patch: Partial<MarkFlowDraft> = {}
    if (board && ctx.draft.board !== board && !ctx.draft.dirty) {
      patch.board = board
    }
    if (subjectCode && !ctx.draft.subjectCode) {
      patch.subjectCode = subjectCode
    }
    if (Object.keys(patch).length > 0) {
      dispatch({ type: 'SEED_DRAFT', patch })
    }
    // Intentionally omit draft from deps — only react to host prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, subjectCode])

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

  const onPdfChange = useCallback(
    (file: File | null) => {
      setPdfFile(file)
      dispatch({
        type: 'PATCH_DRAFT',
        patch: {
          inputKind: file ? 'pdf' : pages.length ? 'photos' : null,
          pageCount: file ? Math.max(pages.length, 1) : pages.length,
        },
      })
    },
    [pages.length]
  )

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
    return (
      <>
        {hostSlot ?? (
          <section
            className="ms-mark-flow-screen ms-mark-flow-marking"
            aria-busy="true"
            aria-labelledby="mark-flow-marking-title"
          >
            <p id="mark-flow-marking-title" className="ms-mark-hero-title">
              Under the scheme
            </p>
            <p className="ms-mark-hero-lead" role="status">
              Starting the mark…
            </p>
          </section>
        )}
      </>
    )
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
          pastPaperCatalog={pastPaperCatalog}
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
          subjectLabel={
            subjectOptions.find((s) => s.code === ctx.draft.subjectCode)?.label ??
            null
          }
          onBack={() => dispatch({ type: 'BACK_TO_CAPTURE' })}
          onConfirm={() => {
            const payload: MarkFlowSubmitPayload = {
              draft: ctx.draft,
              pages,
              pdfFile,
              typedAnswer: ctx.draft.typedAnswer,
              questionText: ctx.draft.questionText,
              questionPhoto,
            }
            // Whole-paper: stay on confirm until host swaps to the seeded WP tree.
            // One-answer: enter marking so hostSlot can mount without unmounting us.
            if (ctx.draft.scope !== 'whole_paper') {
              dispatch({ type: 'START_MARKING' })
            }
            void Promise.resolve(onSubmit(payload)).catch(() => {
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
})
