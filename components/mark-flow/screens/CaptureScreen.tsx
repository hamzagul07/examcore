'use client'

import { useState } from 'react'
import { AnswerCapture } from '@/components/mark-flow/AnswerCapture'
import { MarkContextSummary } from '@/components/mark-flow/MarkContextSummary'
import {
  MarkBoardPicker,
  boardSupportsWholePaper,
  type MarkExamBoard,
} from '@/components/mark/MarkBoardPicker'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { QuestionUploadField } from '@/components/mark/QuestionUploadField'
import { PageUploader, type UploadPage } from '@/components/upload/PageUploader'
import type { MarkFlowDraft, MarkInputKind, MarkScope } from '../types'

type SubjectOption = { code: string; label: string }

type Props = {
  draft: MarkFlowDraft
  pages: UploadPage[]
  pdfFile: File | null
  questionPhoto: File | null
  subjectOptions: SubjectOption[]
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
  onPatchDraft,
  onPagesChange,
  onPdfChange,
  onQuestionPhotoChange,
  onContinue,
  canContinue,
}: Props) {
  const [contextOpen, setContextOpen] = useState(false)
  const subjectLabel =
    subjectOptions.find((s) => s.code === draft.subjectCode)?.label ?? null
  const board = draft.board as MarkExamBoard
  const allowWholePaper = boardSupportsWholePaper(board)
  const isPaper = draft.scope === 'whole_paper'

  return (
    <section className="ms-mark-flow-screen" aria-labelledby="mark-flow-capture-title">
      <header className="ms-mark-hero ms-fade-in mb-6">
        <div className="mb-2 flex items-center gap-2">
          <p className="ms-overline ms-mark-hero-eyebrow mb-0">Marking desk</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            M1
          </span>
        </div>
        <h1 id="mark-flow-capture-title" className="ms-mark-hero-title">
          {isPaper ? 'Mark a paper' : 'Mark an answer'}
        </h1>
        <p className="ms-mark-hero-lead">
          {isPaper
            ? 'Photograph every page of your script. Set the paper code before continuing.'
            : 'Take a photo or type what you wrote. Board and subject stay editable below.'}
        </p>
      </header>

      <div className="mb-5">
        <SegmentedControl
          className="flex flex-wrap gap-2"
          optionClassName="ec-pill"
          aria-label="What are you marking"
          value={draft.scope}
          onChange={(scope: MarkScope) => {
            onPatchDraft({
              scope,
              ...(scope === 'whole_paper'
                ? { inputKind: 'photos', typedAnswer: '' }
                : {}),
            })
          }}
          options={[
            { value: 'one_answer', label: 'One answer' },
            {
              value: 'whole_paper',
              label: 'Whole paper',
              disabled: !allowWholePaper,
            },
          ]}
        />
        {!allowWholePaper ? (
          <p className="mt-2 font-mono text-[11px] text-[var(--ec-text-secondary)]">
            Whole-paper marking is Cambridge-only for now.
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
                onChange: (e) => onPatchDraft({ questionText: e.target.value }),
                placeholder: 'Paste or type the question stem…',
                rows: 4,
                className: 'ec-input min-h-[100px] font-mono text-sm leading-relaxed',
              }}
            />
          </div>
          <div>
            <p className="ms-micro mb-3">YOUR WORKING</p>
            <AnswerCapture
              pages={pages}
              onPagesChange={onPagesChange}
              typedAnswer={draft.typedAnswer}
              onTypedAnswerChange={(typedAnswer) => onPatchDraft({ typedAnswer })}
              inputKind={draft.inputKind}
              onInputKindChange={(inputKind: MarkInputKind) =>
                onPatchDraft({ inputKind })
              }
              allowPdf
              pdfFile={pdfFile}
              onPdfChange={onPdfChange}
            />
          </div>
        </div>
      )}

      <MarkContextSummary
        board={board}
        subjectLabel={
          isPaper
            ? [draft.paperCode, draft.paperSession].filter(Boolean).join(' · ') ||
              subjectLabel
            : subjectLabel
        }
        scopeLabel={isPaper ? 'Whole paper' : 'One answer'}
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
