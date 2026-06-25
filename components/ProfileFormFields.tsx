'use client'

import { Check } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  BOARDS,
  SUBJECT_GROUPS,
  IB_DIPLOMA_LEVEL,
  isIbBoard,
  isSubjectValidForProfile,
  subjectsInGroup,
  ibSubjectGroups,
  ibSubjectsInGroup,
  levelsForBoard,
  type ProfileOption,
  type SubjectOption,
} from '@/lib/profile-options'

type Props = {
  fullName: string
  setFullName: (s: string) => void
  board: string
  setBoard: (s: string) => void
  level: string
  setLevel: (s: string) => void
  subjects: string[]
  setSubjects: (s: string[]) => void
  examDate?: string
  setExamDate?: (s: string) => void
  showFullName?: boolean
}

export function ProfileFormFields({
  fullName,
  setFullName,
  board,
  setBoard,
  level,
  setLevel,
  subjects,
  setSubjects,
  examDate,
  setExamDate,
  showFullName = true,
}: Props) {
  const ib = isIbBoard(board)

  function handleBoardChange(nextBoard: string) {
    setBoard(nextBoard)
    setSubjects([])
    setLevel(isIbBoard(nextBoard) ? IB_DIPLOMA_LEVEL : 'A-Level')
  }

  function handleLevelChange(nextLevel: string) {
    setLevel(nextLevel)
    setSubjects(subjects.filter((id) => isSubjectValidForProfile(board, nextLevel, id)))
  }

  function toggleSubject(id: string) {
    if (subjects.includes(id)) {
      setSubjects(subjects.filter((s) => s !== id))
      return
    }
    if (subjects.length >= 4) return
    setSubjects([...subjects, id])
  }

  const subjectGroups = ib ? ibSubjectGroups() : [...SUBJECT_GROUPS]
  const visibleLevels = levelsForBoard(board)

  return (
    <div className="space-y-7">
      {showFullName && (
        <div>
          <Label
            htmlFor="fullName"
            className="label-overline mb-2 inline-block"
          >
            Your name (optional)
          </Label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
            placeholder="Hassan"
            className="ec-input"
          />
        </div>
      )}

      {setExamDate !== undefined && (
        <div>
          <Label htmlFor="examDate" className="label-overline mb-2 inline-block">
            Exam date (optional)
          </Label>
          <input
            id="examDate"
            type="date"
            value={examDate ?? ''}
            onChange={(e) => setExamDate(e.target.value)}
            className="ec-input max-w-xs"
          />
          <p className="text-caption mt-1.5">
            Shown as a countdown on your dashboard home page.
          </p>
        </div>
      )}

      <FieldGroup
        label="Exam board"
        hint="Cambridge International and IB Diploma are both live."
      >
        <OptionGrid
          options={BOARDS.filter((b) => b.enabled)}
          selected={board}
          onSelect={handleBoardChange}
          mode="single"
        />
      </FieldGroup>

      {!ib ? (
        <FieldGroup label="Cambridge level">
          <OptionGrid
            options={visibleLevels}
            selected={level}
            onSelect={handleLevelChange}
            mode="single"
          />
        </FieldGroup>
      ) : (
        <FieldGroup label="Programme">
          <p className="text-body text-[var(--ec-text-secondary)]">
            IB Diploma — pick HL, SL, and Core subjects below (up to four).
          </p>
        </FieldGroup>
      )}

      <FieldGroup
        label="Subjects you're studying"
        hint={`${subjects.length}/4 selected — tap to add or remove.`}
      >
        <div className="space-y-5">
          {subjectGroups.map((group) => {
            const groupSubjects = ib
              ? ibSubjectsInGroup(group)
              : subjectsInGroup(group, level)
            if (groupSubjects.length === 0) return null
            return (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]">
                  {group}
                </p>
                <SubjectGrid
                  options={groupSubjects}
                  selectedMany={subjects}
                  onToggle={toggleSubject}
                  showCode={!ib}
                  maxSelected={4}
                />
              </div>
            )
          })}
        </div>
      </FieldGroup>
    </div>
  )
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="label-overline">{label}</span>
        {hint ? <span className="text-xs text-[var(--ec-text-secondary)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

type OptionGridProps =
  | {
      mode: 'single'
      options: ProfileOption[]
      selected: string
      onSelect: (id: string) => void
    }
  | {
      mode: 'multi'
      options: ProfileOption[]
      selectedMany: string[]
      onToggle: (id: string) => void
    }

function OptionGrid(props: OptionGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {props.options.map((opt) => {
        const isActive =
          props.mode === 'single'
            ? props.selected === opt.id
            : props.selectedMany.includes(opt.id)
        const isDisabled = !opt.enabled

        return (
          <button
            key={opt.id}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return
              if (props.mode === 'single') props.onSelect(opt.id)
              else props.onToggle(opt.id)
            }}
            className={optionButtonClass(isActive, isDisabled)}
            aria-pressed={isActive}
          >
            <span>{opt.label}</span>
            {isDisabled ? (
              <span
                className="rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]"
                title="Not available yet"
              >
                Planned
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function SubjectGrid({
  options,
  selectedMany,
  onToggle,
  showCode,
  maxSelected,
}: {
  options: SubjectOption[]
  selectedMany: string[]
  onToggle: (id: string) => void
  showCode: boolean
  maxSelected: number
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {options.map((opt) => {
        const isActive = selectedMany.includes(opt.id)
        const isDisabled = !opt.enabled || (!isActive && selectedMany.length >= maxSelected)

        return (
          <button
            key={opt.code}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return
              onToggle(opt.id)
            }}
            className={optionButtonClass(isActive, isDisabled)}
            aria-pressed={isActive}
          >
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`flex items-center justify-center rounded-md border transition-colors ${
                  isActive
                    ? 'ec-checkbox-active border'
                    : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
                style={{ width: 18, height: 18 }}
              >
                {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span>
                {opt.label}
                {showCode ? (
                  <span className="ml-1.5 font-mono text-[10px] text-[var(--ec-text-secondary)]">
                    {opt.code}
                  </span>
                ) : null}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function optionButtonClass(isActive: boolean, isDisabled: boolean) {
  return `group relative flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ${
    isDisabled
      ? 'cursor-not-allowed border-[var(--ec-border)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)]'
      : isActive
        ? 'ec-option-active text-[var(--ec-text-primary)]'
        : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--ec-brand)_30%,transparent)] hover:bg-[var(--ec-brand-muted)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15)]'
  }`
}
