'use client'

import { Check } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  BOARDS,
  LEVELS,
  SUBJECTS,
  type ProfileOption,
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
  showFullName = true,
}: Props) {
  function toggleSubject(id: string) {
    if (subjects.includes(id)) {
      setSubjects(subjects.filter((s) => s !== id))
    } else {
      setSubjects([...subjects, id])
    }
  }

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

      <FieldGroup label="Exam board" hint="More boards arriving soon.">
        <OptionGrid
          options={BOARDS}
          selected={board}
          onSelect={setBoard}
          mode="single"
        />
      </FieldGroup>

      <FieldGroup label="Level">
        <OptionGrid
          options={LEVELS}
          selected={level}
          onSelect={setLevel}
          mode="single"
        />
      </FieldGroup>

      <FieldGroup
        label="Subjects you're studying"
        hint="You can pick more than one."
      >
        <OptionGrid
          options={SUBJECTS}
          selectedMany={subjects}
          onToggle={toggleSubject}
          mode="multi"
        />
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
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="label-overline">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
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
            className={`group relative flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ${
              isDisabled
                ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
                : isActive
                ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.15),0_0_24px_rgba(16,185,129,0.25)]'
                : 'border-white/10 bg-dark-900/60 text-slate-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-dark-800/70 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4)]'
            }`}
            aria-pressed={isActive}
          >
            <span className="flex items-center gap-2.5">
              {props.mode === 'multi' && (
                <span
                  aria-hidden="true"
                  className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-colors ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'border-white/20 bg-dark-900'
                  }`}
                  style={{ width: 18, height: 18 }}
                >
                  {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
              {opt.label}
            </span>
            {isDisabled && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Coming soon
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
