'use client'

import { Label } from '@/components/ui/label'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { QuestionPreviewPanel } from '@/components/mark/QuestionPreviewPanel'
import { getSubjectByCode } from '@/lib/profile-options'
import { resolveSubjectLabel } from '@/lib/ib/marking-config'
import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'

type Props = {
  markBoard: MarkExamBoard
  selectedSubject: string
  selectedYear: number | ''
  selectedSession: string
  selectedComponent: string
  questionNumber: string
  availableYears: number[]
  availableSeasons: string[]
  availableComponents: string[]
  paperQuestionOptions: string[]
  papersLoading: boolean
  profileSelectableSubjects: string[]
  availablePapers: Record<
    string,
    { subject: string; sessions: Record<string, unknown> }
  > | null
  componentLabel: (component: string) => string
  onSubjectChange: (value: string) => void
  onYearChange: (value: string) => void
  onSessionChange: (value: string) => void
  onComponentChange: (value: string) => void
  onQuestionNumberChange: (value: string) => void
  onSchemeFound?: (found: boolean) => void
}

function subjectLabel(code: string, availablePapers: Props['availablePapers']) {
  const info = availablePapers?.[code]
  const meta = getSubjectByCode(code)
  return info?.subject ?? meta?.label ?? resolveSubjectLabel(code)
}

export function PastPaperSelectorFields({
  markBoard,
  selectedSubject,
  selectedYear,
  selectedSession,
  selectedComponent,
  questionNumber,
  availableYears,
  availableSeasons,
  availableComponents,
  paperQuestionOptions,
  papersLoading,
  profileSelectableSubjects,
  availablePapers,
  componentLabel,
  onSubjectChange,
  onYearChange,
  onSessionChange,
  onComponentChange,
  onQuestionNumberChange,
  onSchemeFound,
}: Props) {
  const paperCode =
    selectedSubject && selectedComponent
      ? `${selectedSubject}/${selectedComponent}`
      : ''
  const paperSession =
    selectedSession && selectedYear !== ''
      ? `${selectedSession} ${selectedYear}`
      : ''
  const isFilled = !!(
    selectedSubject &&
    selectedYear !== '' &&
    selectedSession &&
    selectedComponent &&
    questionNumber.trim()
  )

  if (markBoard === 'ib') {
    return (
      <div className="rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        Cambridge past-paper lookup is not used for IB. Use{' '}
        <strong className="text-[var(--ec-text-primary)]">My question</strong> above,
        pick your IB subject, and paste or photograph the prompt — we mark against IB
        assessment criteria.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Select the exact Cambridge past paper and question — we load the official mark
        scheme when it&apos;s in our database.
      </p>

      {papersLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy aria-label="Loading available papers">
          <div>
            <SkeletonLine className="mb-2 h-3 w-16" />
            <SkeletonBlock className="h-11 w-full" />
          </div>
          <div>
            <SkeletonLine className="mb-2 h-3 w-16" />
            <SkeletonBlock className="h-11 w-full" />
          </div>
        </div>
      )}

      {!papersLoading && profileSelectableSubjects.length === 0 && (
        <p className="text-sm text-[var(--ec-text-secondary)]">
          No Cambridge past papers available for your subjects yet. Try{' '}
          <strong className="text-[var(--ec-text-primary)]">My question</strong> instead.
        </p>
      )}

      {!papersLoading && profileSelectableSubjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="past-paper-subject" className="label-overline mb-2 inline-block">
              Subject
            </Label>
            <select
              id="past-paper-subject"
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="ec-input select-chevron appearance-none"
            >
              <option value="">Select…</option>
              {profileSelectableSubjects.map((code) => (
                <option key={code} value={code}>
                  {subjectLabel(code, availablePapers)} ({code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="past-paper-year" className="label-overline mb-2 inline-block">
              Year
            </Label>
            <select
              id="past-paper-year"
              value={selectedYear === '' ? '' : String(selectedYear)}
              onChange={(e) => onYearChange(e.target.value)}
              disabled={!selectedSubject}
              className="ec-input select-chevron appearance-none"
            >
              <option value="">Select…</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="past-paper-session" className="label-overline mb-2 inline-block">
              Session
            </Label>
            <select
              id="past-paper-session"
              value={selectedSession}
              onChange={(e) => onSessionChange(e.target.value)}
              disabled={selectedYear === ''}
              className="ec-input select-chevron appearance-none"
            >
              <option value="">Select…</option>
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="past-paper-component" className="label-overline mb-2 inline-block">
              Paper
            </Label>
            <select
              id="past-paper-component"
              value={selectedComponent}
              onChange={(e) => onComponentChange(e.target.value)}
              disabled={!selectedSession}
              className="ec-input select-chevron appearance-none"
            >
              <option value="">Select…</option>
              {availableComponents.map((c) => (
                <option key={c} value={c}>
                  {componentLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="past-paper-question" className="label-overline mb-2 inline-block">
              Question number
            </Label>
            {paperQuestionOptions.length > 0 ? (
              <select
                id="past-paper-question"
                value={questionNumber}
                onChange={(e) => onQuestionNumberChange(e.target.value)}
                disabled={!selectedComponent}
                className="ec-input select-chevron appearance-none"
              >
                <option value="">Select…</option>
                {paperQuestionOptions.map((q) => (
                  <option key={q} value={q}>
                    Question {q}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="past-paper-question"
                type="text"
                value={questionNumber}
                onChange={(e) => onQuestionNumberChange(e.target.value)}
                disabled={!selectedComponent}
                placeholder="e.g., 1, 2(a), 3(b)(i)"
                className="ec-input"
              />
            )}
          </div>
        </div>
      )}

      {isFilled ? (
        <>
          <div className="ec-highlight-success">
            Selected:{' '}
            <strong>
              {selectedSubject}/{selectedComponent}
            </strong>{' '}
            — {selectedSession} {selectedYear}, Question{' '}
            <strong>{questionNumber.trim()}</strong>
          </div>
          <QuestionPreviewPanel
            paperCode={paperCode}
            paperSession={paperSession}
            questionNumber={questionNumber}
            subjectCode={selectedSubject}
            onDetailLoaded={onSchemeFound}
          />
        </>
      ) : null}
    </div>
  )
}
