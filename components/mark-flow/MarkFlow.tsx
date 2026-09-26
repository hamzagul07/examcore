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
import { revokePagePreviews } from '@/lib/upload/page-previews'
import { DraftGuard } from './DraftGuard'
import {
  CaptureScreen,
  type PastPaperCatalogProps,
} from './screens/CaptureScreen'
import { ConfirmScreen } from './screens/ConfirmScreen'
import {
  canEnterConfirm,
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
        // Release the previews with the pages, or every blob URL from every
        // mark stays registered for the life of the tab.
        setPages((prev) => {
          revokePagePreviews(prev)
          return []
        })
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
      setPages((prev) => (typeof next === 'function' ? next(prev) : next))
    },
    []
  )

  const onPdfChange = useCallback((file: File | null) => {
    setPdfFile(file)
  }, [])

  const onQuestionPhotoChange = useCallback((file: File | null) => {
    setQuestionPhoto(file)
  }, [])

  // The draft's view of the files is DERIVED from the files, in one place.
  //
  // It used to be patched from inside each setter, with whatever `pdfFile` or
  // `pages.length` the closure held. Choosing a PDF runs "set pdf" then "clear
  // pages" in the same tick, so the second patch saw the old (null) pdf and
  // wrote pageCount 0 — leaving the reducer certain there was no answer while
  // the screen showed one. Deriving after commit cannot see stale state.
  const { pageCount, hasPdf, hasQuestionPhoto, inputKind } = ctx.draft
  useEffect(() => {
    // "Type it" is the student's explicit choice and stays until they switch
    // back to photos (AnswerCapture patches the kind); the upload kinds are
    // whatever the files say.
    const nextKind =
      inputKind === 'typed'
        ? 'typed'
        : pdfFile
          ? 'pdf'
          : pages.length
            ? 'photos'
            : null
    const patch: Partial<MarkFlowDraft> = {}
    if (pageCount !== pages.length) patch.pageCount = pages.length
    if (hasPdf !== !!pdfFile) patch.hasPdf = !!pdfFile
    if (hasQuestionPhoto !== !!questionPhoto) patch.hasQuestionPhoto = !!questionPhoto
    if (inputKind !== nextKind) patch.inputKind = nextKind
    if (Object.keys(patch).length > 0) dispatch({ type: 'PATCH_DRAFT', patch })
  }, [pages.length, pdfFile, questionPhoto, pageCount, hasPdf, hasQuestionPhoto, inputKind])

  // The same predicate the reducer applies to CONTINUE_TO_CONFIRM, so the
  // button can never be enabled for a transition the reducer refuses.
  const ready = useMemo(() => canEnterConfirm(ctx.draft), [ctx.draft])

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
