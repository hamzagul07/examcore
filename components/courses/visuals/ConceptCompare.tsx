import { GraduationCap, Sparkles } from 'lucide-react'

type Side = { title: string; points: string[] }

export function ConceptCompare({
  title,
  simple,
  exam,
}: {
  title: string
  simple: Side
  exam: Side
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[var(--ec-text-primary)]">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="course-compare-card course-compare-simple rounded-2xl border border-dashed border-[var(--ec-brand)]/40 bg-[color-mix(in_srgb,var(--ec-brand)_6%,transparent)] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ec-text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
            {simple.title}
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {simple.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-[var(--ec-brand)]">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="course-compare-card rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ec-text-primary)]">
            <GraduationCap className="h-4 w-4 text-[var(--ec-accent)]" aria-hidden />
            {exam.title}
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {exam.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-[var(--ec-accent)]">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
