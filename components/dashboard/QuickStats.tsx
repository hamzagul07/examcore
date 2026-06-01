import { Flame, TrendingUp, Calendar, BookOpen } from 'lucide-react'
import { getSyllabusSubjectName } from '@/lib/syllabi'

type Props = {
  monthlyAttempts: number
  streak: number
  bestSubjectCode: string | null
  topicsAttempted: number
}

export function QuickStats({
  monthlyAttempts,
  streak,
  bestSubjectCode,
  topicsAttempted,
}: Props) {
  const bestLabel = bestSubjectCode
    ? getSyllabusSubjectName(bestSubjectCode) || bestSubjectCode
    : '—'

  const stats = [
    {
      label: 'This month',
      value: String(monthlyAttempts),
      sub: 'questions marked',
      icon: Calendar,
    },
    {
      label: 'Streak',
      value: String(streak),
      sub: streak === 1 ? 'day' : 'days',
      icon: Flame,
    },
    {
      label: 'Best this week',
      value: bestLabel,
      sub: 'by average score',
      icon: TrendingUp,
      small: bestSubjectCode !== null,
    },
    {
      label: 'Topics',
      value: String(topicsAttempted),
      sub: 'touched',
      icon: BookOpen,
    },
  ]

  return (
    <section className="mb-8">
      <h2 className="text-title mb-4">Quick stats</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, small }) => (
          <div key={label} className="ec-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-[var(--ec-brand)]" strokeWidth={1.75} />
              <p className="ec-label-tech text-[10px]">{label}</p>
            </div>
            <p
              className={`font-extrabold tracking-tight text-[var(--ec-text-primary)] ${
                small ? 'text-lg' : 'text-3xl'
              }`}
            >
              {value}
            </p>
            <p className="text-caption mt-1">{sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
