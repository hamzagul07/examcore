'use client'

import { useCallback, useState } from 'react'
import { AnswerCapture } from '@/components/mark-flow/AnswerCapture'
import { MarkContextSummary } from '@/components/mark-flow/MarkContextSummary'
import {
  MarkFlowPastPaperPicker,
  type AvailablePapersMap,
  type PastPaperPick,
} from '@/components/mark-flow/MarkFlowPastPaperPicker'
import {
  MarkBoardPicker,
  boardSupportsPastPaperLookup,
  boardSupportsWholePaper,
  type MarkExamBoard,
} from '@/components/mark/MarkBoardPicker'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { QuestionUploadField } from '@/components/mark/QuestionUploadField'
import { PageUploader, type UploadPage } from '@/components/upload/PageUploader'
import type {
  MarkFlowDraft,
  MarkInputKind,
  MarkPracticeKind,
  MarkQuestionSource,
  MarkScope,
} from '../types'

type SubjectOption = { code: string; label: string }

export type PastPaperCatalogProps = {
  availablePapers: AvailablePapersMap | null
  papersLoading: boolean
  subjectCodes: string[]
}

type Props = {
  draft: MarkFlowDraft
  pages: UploadPage[]
  pdfFile: File | null
  questionPhoto: File | null
  subjectOptions: SubjectOption[]
  pastPaperCatalog?: PastPaperCatalogProps | null
  onPatchDraft: (patch: Partial<MarkFlowDraft>) => void
  onPagesChange: (pages: UploadPage[] | ((prev: UploadPage[]) => UploadPage[])) => void
  onPdfChange: (file: File | null) => void
  onQuestionPhotoChange: (file: File | null) => void
  onContinue: () => void
  canContinue: boolean
}

export function CaptureScreen({
  draft,
  pages,
  pdfFile,
  questionPhoto,
  subjectOptions,
  pastPaperCatalog = null,
  onPatchDraft,
  onPagesChange,
  onPdfChange,
  onQuestionPhotoChange,
  onContinue,
  canContinue,
}: Props) {
  const [contextOpen, setContextOpen] = useState(false)
  const [manualPaperEntry, setManualPaperEntry] = useState(false)
  const subjectLabel =
    subjectOptions.find((s) => s.code === draft.subjectCode)?.label ?? null
  const board = draft.board as MarkExamBoard
  const allowWholePaper = boardSupportsWholePaper(board)
  const allowPastPaper = boardSupportsPastPaperLookup(board)
  const isPaper = draft.scope === 'whole_paper'
  const isPastPaperQ =
    !isPaper && draft.questionSource === 'past_paper' && allowPastPaper
  const isCombined =
    !isPaper && !isPastPaperQ && draft.practiceKind === 'combined_script'

  type CaptureMode = 'my_question' | 'past_paper' | 'whole_paper'
  const captureMode: CaptureMode = isPaper
    ? 'whole_paper'
    : isPastPaperQ
      ? 'past_paper'
      : 'my_question'

  const onPastPaperPick = useCallback(
    (pick: PastPaperPick | null) => {
      if (!pick) {
        onPatchDraft({
          paperCode: null,
          paperSession: null,
          questionNumber: null,
        })
        return
      }
      onPatchDraft({
        subjectCode: pick.subjectCode,
        paperCode: pick.paperCode,
        paperSession: pick.paperSession,
        questionNumber: pick.questionNumber,
      })
    },
    [onPatchDraft]
  )

  function setCaptureMode(mode: CaptureMode) {
    if (mode === 'whole_paper') {
      onPatchDraft({
        scope: 'whole_paper',
        questionSource: 'practice',
        practiceKind: 'separate',
        inputKind: 'photos',
        typedAnswer: '',
        questionText: '',
        hasQuestionPhoto: false,
        questionNumber: null,
      })
      return
    }
    if (mode === 'past_paper') {
      onPatchDraft({
        scope: 'one_answer',
        questionSource: 'past_paper',
        practiceKind: 'separate',
      })
      return
    }
    onPatchDraft({
      scope: 'one_answer',
      questionSource: 'practice',
      practiceKind: 'separate',
      paperCode: null,
      paperSession: null,
      questionNumber: null,
    })
  }

  function setPracticeKind(kind: MarkPracticeKind) {
    if (kind === 'combined_script') {
      onQuestionPhotoChange(null)
      onPatchDraft({
        practiceKind: 'combined_script',
        questionSource: 'practice',
        questionText: '',
        hasQuestionPhoto: false,
        typedAnswer: '',
        inputKind: pages.length || pdfFile ? (pdfFile ? 'pdf' : 'photos') : 'photos',
        totalMarksHint: draft.totalMarksHint,
      })
      return
    }
    onPatchDraft({ practiceKind: 'separate' })
  }

  return (
    <section className="ms-mark-flow-screen" aria-labelledby="mark-flow-capture-title">
      <header className="ms-mark-hero ms-fade-in mb-6">
        <div className="mb-2 flex items-center gap-2">
          <p className="ms-overline ms-mark-hero-eyebrow mb-0">Marking desk</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            M1
          </span>
        </div>
        <h2 id="mark-flow-capture-title" className="ms-mark-hero-title">
          {isPaper
            ? 'Mark a paper'
            : isPastPaperQ
              ? 'Mark a past-paper question'
              : isCombined
                ? 'Mark a scanned script'
                : 'Mark an answer'}
        </h2>
        <p className="ms-mark-hero-lead">
          {isPaper
            ? 'Photograph every page of your script. Set the paper code before continuing.'
            : isPastPaperQ
              ? 'Pick the paper from the catalog, then add your working.'
              : isCombined
                ? 'One upload with the question and your working together. Pick the subject first.'
                : 'Choose the subject, add the question, then your working.'}
        </p>
      </header>

      <div className="ms-mark-flow-mode mb-6">
        <SegmentedControl
          className="flex flex-wrap justify-center gap-2"
          optionClassName="ec-pill"
          aria-label="What are you marking"
          value={captureMode}
          onChange={setCaptureMode}
          options={[
            { value: 'my_question', label: 'My question' },
            {
              value: 'past_paper',
              label: 'Past paper',
              disabled: !allowPastPaper,
            },
            {
              value: 'whole_paper',
              label: 'Whole paper',
              disabled: !allowWholePaper,
            },
          ]}
        />
        {!allowPastPaper || !allowWholePaper ? (
          <p className="mt-2 text-center font-mono text-[11px] text-[var(--ec-text-secondary)]">
            {!allowPastPaper && !allowWholePaper
              ? 'Past-paper lookup and whole-paper marking are Cambridge-only for now.'
              : !allowPastPaper
                ? 'Past-paper lookup is Cambridge-only for now.'
                : 'Whole-paper marking is Cambridge-only for now.'}
          </p>
        ) : null}
      </div>

      {isPaper ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Paper code"
              hint="e.g. 9709/12"
              inputProps={{
                value: draft.paperCode ?? '',
                onChange: (e) =>
                  onPatchDraft({ paperCode: e.target.value.trim() || null }),
                placeholder: '9709/12',
                autoComplete: 'off',
              }}
            />
            <Field
              label="Session"
              hint="e.g. May/June 2024"
              inputProps={{
                value: draft.paperSession ?? '',
                onChange: (e) =>
                  onPatchDraft({ paperSession: e.target.value.trim() || null }),
                placeholder: 'May/June 2024',
                autoComplete: 'off',
              }}
            />
          </div>
          <PageUploader
            pages={pages}
            onPagesChange={onPagesChange}
            allowPdf
            pdfFile={pdfFile}
            onPdfChange={(f) => {
              onPdfChange(f)
              if (f) onPatchDraft({ inputKind: 'pdf' })
            }}
            emptyLabel="Take photos of every page"
            emptyHint="Camera, gallery, or a full PDF scan — page count only until we mark"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {isPastPaperQ ? (
            <div className="space-y-4">
              <p className="ms-micro">PAST PAPER</p>
              {!manualPaperEntry && pastPaperCatalog ? (
                <MarkFlowPastPaperPicker
                  availablePapers={pastPaperCatalog.availablePapers}
                  papersLoading={pastPaperCatalog.papersLoading}
                  subjectCodes={pastPaperCatalog.subjectCodes}
                  initial={{
                    subjectCode: draft.subjectCode ?? undefined,
                    paperCode: draft.paperCode ?? undefined,
                    paperSession: draft.paperSession ?? undefined,
                    questionNumber: draft.questionNumber ?? undefined,
                  }}
                  onChange={onPastPaperPick}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Paper code"
                    hint="e.g. 9709/12"
                    inputProps={{
                      value: draft.paperCode ?? '',
                      onChange: (e) => {
                        const paperCode = e.target.value.trim() || null
                        const subjectFromCode = paperCode?.split('/')[0] || null
                        onPatchDraft({
                          paperCode,
                          subjectCode: subjectFromCode || draft.subjectCode,
                        })
                      },
                      placeholder: '9709/12',
                      autoComplete: 'off',
                    }}
                  />
                  <Field
                    label="Session"
                    hint="e.g. May/June 2024"
                    inputProps={{
                      value: draft.paperSession ?? '',
                      onChange: (e) =>
                        onPatchDraft({
                          paperSession: e.target.value.trim() || null,
                        }),
                      placeholder: 'May/June 2024',
                      autoComplete: 'off',
                    }}
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Question number"
                    hint="As printed on the paper"
                    inputProps={{
                      value: draft.questionNumber ?? '',
                      onChange: (e) =>
                        onPatchDraft({
                          questionNumber: e.target.value.trim() || null,
                        }),
                      placeholder: '5',
                      autoComplete: 'off',
                    }}
                  />
                </div>
              )}
              {pastPaperCatalog ? (
                <button
                  type="button"
                  className="font-mono text-[11px] text-[var(--ec-brand)] underline underline-offset-2"
                  onClick={() => setManualPaperEntry((v) => !v)}
                >
                  {manualPaperEntry
                    ? 'Use catalog pickers'
                    : 'Type paper code manually'}
                </button>
              ) : null}
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--ec-brand)]">
                  Optional: add the printed question
                </summary>
                <div className="mt-3 space-y-3">
                  <QuestionUploadField
                    id="mark-flow-question-photo-pp"
                    label="Photo of the question"
                    file={questionPhoto}
                    onChange={onQuestionPhotoChange}
                  />
                  <Field
                    label="Or type the stem"
                    as="textarea"
                    inputProps={{
                      value: draft.questionText,
                      onChange: (e) =>
                        onPatchDraft({ questionText: e.target.value }),
                      rows: 3,
                      className:
                        'ec-input min-h-[80px] font-mono text-sm leading-relaxed',
                    }}
                  />
                </div>
              </details>
              <Field
                label="Total marks"
                hint="Required — used when this paper isn’t in our bank yet. Banked schemes still win when present."
                inputProps={{
                  type: 'number',
                  min: 1,
                  max: 100,
                  inputMode: 'numeric',
                  value: draft.totalMarksHint ?? '',
                  onChange: (e) => {
                    const n = Number(e.target.value)
                    onPatchDraft({
                      totalMarksHint:
                        e.target.value && Number.isFinite(n) && n > 0
                          ? n
                          : null,
                    })
                  },
                  placeholder: 'e.g. 8',
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="ms-micro mb-3">HOW IS THE QUESTION ATTACHED</p>
                <SegmentedControl
                  className="flex flex-wrap gap-2"
                  optionClassName="ec-pill"
                  aria-label="How the question is provided"
                  value={draft.practiceKind}
                  onChange={setPracticeKind}
                  options={[
                    { value: 'separate', label: 'Question + working' },
                    { value: 'combined_script', label: 'Scanned script' },
                  ]}
                />
                <p className="mt-2 font-mono text-[11px] text-[var(--ec-text-secondary)]">
                  {isCombined
                    ? 'Question and working on the same photos or PDF.'
                    : 'Upload or type the question separately from your working.'}
                </p>
              </div>
              <div>
                <p className="ms-micro mb-3">SUBJECT</p>
                <label htmlFor="mark-flow-subject" className="label-overline mb-2 inline-block">
                  What subject is this?
                </label>
                <select
                  id="mark-flow-subject"
                  value={draft.subjectCode ?? ''}
                  onChange={(e) =>
                    onPatchDraft({ subjectCode: e.target.value || null })
                  }
                  className="ec-input select-chevron appearance-none"
                  required
                >
                  <option value="">Select a subject…</option>
                  {subjectOptions.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label} ({s.code})
                    </option>
                  ))}
                </select>
                {!draft.subjectCode ? (
                  <p className="mt-1.5 text-xs text-[var(--ec-text-secondary)]">
                    Needed so we apply the right mark-scheme style.
                  </p>
                ) : null}
              </div>
              {!isCombined ? (
                <div className="space-y-3">
                  <p className="ms-micro">THE QUESTION</p>
                  <QuestionUploadField
                    id="mark-flow-question-photo"
                    label="Photo of the question"
                    hint="Optional if you type the stem below — JPEG, PNG, WebP, or PDF"
                    file={questionPhoto}
                    onChange={onQuestionPhotoChange}
                  />
                  <Field
                    label="Or type the question"
                    hint="At least 10 characters, or attach a photo above"
                    as="textarea"
                    inputProps={{
                      value: draft.questionText,
                      onChange: (e) =>
                        onPatchDraft({ questionText: e.target.value }),
                      placeholder: 'Paste or type the question stem…',
                      rows: 4,
                      className:
                        'ec-input min-h-[100px] font-mono text-sm leading-relaxed',
                    }}
                  />
                </div>
              ) : null}
              <Field
                label="Total marks"
                hint={
                  isCombined
                    ? 'Required — enter the mark total for the script (or the main question) so we mark out of the right number'
                    : 'Required — enter the mark total shown on the question (e.g. 18)'
                }
                inputProps={{
                  type: 'number',
                  min: 1,
                  max: 100,
                  inputMode: 'numeric',
                  value: draft.totalMarksHint ?? '',
                  onChange: (e) => {
                    const n = Number(e.target.value)
                    onPatchDraft({
                      totalMarksHint:
                        e.target.value && Number.isFinite(n) && n > 0
                          ? n
                          : null,
                    })
                  },
                  placeholder: 'e.g. 6',
                }}
              />
            </div>
          )}
          <div>
            <p className="ms-micro mb-3">
              {isCombined ? 'YOUR SCRIPT' : 'YOUR WORKING'}
            </p>
            {isCombined ? (
              <PageUploader
                pages={pages}
                onPagesChange={onPagesChange}
                allowPdf
                pdfFile={pdfFile}
                onPdfChange={(f) => {
                  onPdfChange(f)
                  if (f) onPatchDraft({ inputKind: 'pdf' })
                  else if (pages.length)
                    onPatchDraft({ inputKind: 'photos' })
                }}
                emptyLabel="Drop your script here"
                emptyHint="Photos or PDF — question and answer together"
              />
            ) : (
              <AnswerCapture
                pages={pages}
                onPagesChange={onPagesChange}
                typedAnswer={draft.typedAnswer}
                onTypedAnswerChange={(typedAnswer) =>
                  onPatchDraft({ typedAnswer })
                }
                inputKind={draft.inputKind}
                onInputKindChange={(inputKind: MarkInputKind) =>
                  onPatchDraft({ inputKind })
                }
                allowPdf
                pdfFile={pdfFile}
                onPdfChange={onPdfChange}
              />
            )}
          </div>
        </div>
      )}

      <MarkContextSummary
        board={board}
        subjectLabel={
          isPaper || isPastPaperQ
            ? [
                draft.paperCode,
                draft.paperSession,
                draft.questionNumber ? `Q${draft.questionNumber}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || subjectLabel
            : subjectLabel
        }
        scopeLabel={
          isPaper
            ? 'Whole paper'
            : isPastPaperQ
              ? 'Past paper question'
              : isCombined
                ? 'Scanned script'
                : 'My question'
        }
        onEdit={() => setContextOpen(true)}
      />

      <div className="mt-6">
        <button
          type="button"
          className="ec-btn-primary w-full justify-center sm:w-auto"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue to check
        </button>
      </div>

      <Sheet
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        title="Marking context"
        labelledById="mark-flow-context-title"
      >
        <h2 id="mark-flow-context-title" className="ms-h3 mb-4">
          Board &amp; subject
        </h2>
        <MarkBoardPicker
          value={board}
          onChange={(next) =>
            onPatchDraft({
              board: next,
              subjectCode: null,
              ...(boardSupportsWholePaper(next)
                ? {}
                : { scope: 'one_answer' as MarkScope }),
              ...(boardSupportsPastPaperLookup(next)
                ? {}
                : {
                    questionSource: 'practice' as MarkQuestionSource,
                    paperCode: null,
                    paperSession: null,
                    questionNumber: null,
                  }),
            })
          }
        />
        <div className="mt-5">
          <Field
            label="Subject"
            inputProps={{
              list: 'mark-flow-subjects',
              value: draft.subjectCode ?? '',
              onChange: (e) => onPatchDraft({ subjectCode: e.target.value || null }),
              placeholder: 'Pick a subject code',
            }}
          />
          <datalist id="mark-flow-subjects">
            {subjectOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </datalist>
        </div>
        <button
          type="button"
          className="ec-btn-primary mt-6 w-full justify-center"
          onClick={() => setContextOpen(false)}
        >
          Done
        </button>
      </Sheet>
    </section>
  )
}
