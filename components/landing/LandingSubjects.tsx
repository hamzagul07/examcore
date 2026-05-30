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
import { SUBJECTS, SUBJECT_GROUPS } from '@/lib/profile-options'

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
}

export function LandingSubjects() {
  return (
    <div className="space-y-12">
      {SUBJECT_GROUPS.map((group) => {
        const subjects = SUBJECTS.filter(
          (s) => s.markingEnabled && s.group === group
        )
        if (subjects.length === 0) return null
        return (
          <div key={group}>
            <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {group}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {subjects.map((subject) => {
                const Icon = ICON_BY_CODE[subject.code] ?? Calculator
                return (
                  <SubjectCard
                    key={subject.code}
                    icon={Icon}
                    name={subject.label}
                    code={subject.code}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SubjectCard({
  icon: Icon,
  name,
  code,
}: {
  icon: LucideIcon
  name: string
  code: string
}) {
  return (
    <div className="ec-card ec-card-interactive relative overflow-hidden p-4 text-center sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-[50px]" />
      <div className="relative">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)] sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 text-emerald-400 sm:h-6 sm:w-6" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-bold leading-tight text-white sm:text-base">
          {name}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-500 sm:text-xs">
          {code}
        </p>
      </div>
    </div>
  )
}
