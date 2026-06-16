'use client'

import { Label } from '@/components/ui/label'
import { QuestionPreviewPanel } from '@/components/mark/QuestionPreviewPanel'

type Props = {
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

export function PastPaperSelectorFields({
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

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Select the exact past paper and question — we load the official Cambridge mark
        scheme when it&apos;s in our database.
      </p>

      {papersLoading && (
        <p className="text-sm text-[var(--ec-text-secondary)]">Loading available papers…</p>
      )}

      {!papersLoading && profileSelectableSubjects.length === 0 && (
        <p className="text-sm text-[var(--ec-text-secondary)]">
          No past papers available yet for your subjects.
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
              {profileSelectableSubjects.map((code) => {
                const info = availablePapers?.[code]
                const label = info?.subject ?? code
                return (
                  <option key={code} value={code}>
                    {label} ({code})
                  </option>
                )
              })}
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
