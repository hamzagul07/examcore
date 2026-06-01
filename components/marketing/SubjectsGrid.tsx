import {
  Calculator,
  Sigma,
  Atom,
  FlaskConical,
  Microscope,
  LineChart,
  Briefcase,
  Wallet,
  Landmark,
  Users,
  Brain,
  Scale,
  BookOpen,
  Cpu,
  Tv,
  type LucideIcon,
} from 'lucide-react'
import {
  SUBJECTS,
  SUBJECT_GROUPS,
  type MarkingType,
  type SubjectOption,
} from '@/lib/profile-options'
import { getSubjectPaperStructure } from '@/lib/subject-papers'

const ICON_BY_CODE: Record<string, LucideIcon> = {
  '9709': Calculator,
  '9231': Sigma,
  '9702': Atom,
  '9701': FlaskConical,
  '9700': Microscope,
  '9708': LineChart,
  '9609': Briefcase,
  '9706': Wallet,
  '9489': Landmark,
  '9699': Users,
  '9990': Brain,
  '9084': Scale,
  '9488': BookOpen,
  '9618': Cpu,
  '9607': Tv,
  '4024': Calculator,
  '4037': Sigma,
  '5090': FlaskConical,
  '5070': FlaskConical,
  '5054': Atom,
}

function levelLabel(levels: string[]): string {
  if (levels.includes('O-Level') && !levels.includes('A-Level')) return 'O-Level'
  if (levels.includes('A-Level') && !levels.includes('O-Level')) return 'A-Level'
  return levels[0] ?? ''
}

function markingTypeLabel(type: MarkingType): string {
  switch (type) {
    case 'point_based':
      return 'Point-based (B1/M1/A1, MCQ)'
    case 'level_of_response':
      return 'Essay bands (LoR)'
    case 'mixed':
      return 'Mixed — point marks & essays'
  }
}

function formatComponents(subject: SubjectOption): string {
  const structure = getSubjectPaperStructure(subject.code)
  if (!structure?.papers.length) return 'Past papers in library'
  return structure.papers
    .map((p) => `Paper ${p.paper}${p.components.length ? ` (${p.components.join(', ')})` : ''}`)
    .join(' · ')
}

export function SubjectsGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="space-y-12">
      {SUBJECT_GROUPS.map((group) => {
        const subjects = SUBJECTS.filter(
          (s) => s.markingEnabled && s.group === group
        )
        if (subjects.length === 0) return null
        return (
          <div key={group}>
            <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ec-text-secondary)]">
              {group}
            </h3>
            <div
              className={
                detailed
                  ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
                  : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              }
            >
              {subjects.map((subject) => (
                <SubjectCard key={subject.code} subject={subject} detailed={detailed} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SubjectCard({
  subject,
  detailed,
}: {
  subject: SubjectOption
  detailed: boolean
}) {
  const Icon = ICON_BY_CODE[subject.code] ?? Calculator

  if (!detailed) {
    return (
      <div className="ec-card ec-card-interactive relative overflow-hidden p-4 text-center sm:p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--ec-brand)_10%,transparent)] blur-[50px]" />
        <div className="relative">
          <div className="ec-tint-success-icon mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-bold leading-tight text-[var(--ec-text-primary)] sm:text-base">
            {subject.label}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--ec-text-secondary)] sm:text-xs">
            {subject.code}
            {levelLabel(subject.levels) && (
              <span className="ml-1.5 text-[9px] uppercase tracking-wider text-[color-mix(in_srgb,var(--ec-brand)_80%,transparent)]">
                · {levelLabel(subject.levels)}
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="ec-card ec-card-interactive flex gap-4 p-5 sm:p-6">
      <div className="ec-tint-success-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h4 className="text-lg font-bold text-[var(--ec-text-primary)]">
            {subject.label}
          </h4>
          <span className="font-mono text-xs text-[var(--ec-text-secondary)]">
            {subject.code}
          </span>
          {levelLabel(subject.levels) && (
            <span className="ec-tint-success-chip rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              {levelLabel(subject.levels)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {formatComponents(subject)}
        </p>
        <p className="mt-2 text-xs font-medium text-[color-mix(in_srgb,var(--ec-brand)_90%,transparent)]">
          {markingTypeLabel(subject.markingType)}
        </p>
      </div>
    </div>
  )
}

/** @deprecated use SubjectsGrid — kept for landing import compatibility */
export function LandingSubjects() {
  return <SubjectsGrid detailed={false} />
}
