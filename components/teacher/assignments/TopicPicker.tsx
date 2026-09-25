'use client'

import { useId, useMemo, useState } from 'react'
import { DEFAULT_PER_TOPIC, MAX_PER_TOPIC } from '@/lib/teacher/assignments/validate'
import {
  clampPerTopic,
  filterTopicTree,
  topicLabel,
  type PickedTopic,
  type TopicGroup,
} from '@/components/teacher/assignments/composer-model'

/**
 * Pick syllabus topics for a drill (docs/TEACHER_SYSTEM_SPEC.md §4 composer:
 * "TopicPicker from getSyllabusTree(subject_code) auto-picks 2/topic").
 *
 * The teacher chooses topics, not questions: on publish the server picks
 * `per_topic` banked questions for each (newest papers first, spread across
 * papers, never a repeat — lib/teacher/assignments/resolve-items). A section
 * can be picked whole. The 12-question cap counts per-topic questions, so a
 * topic cannot be added (or its count raised) past it.
 */
export function TopicPicker({
  tree,
  names,
  selected,
  onChange,
  remaining,
}: {
  tree: readonly TopicGroup[]
  names: ReadonlyMap<string, string>
  selected: readonly PickedTopic[]
  onChange: (next: PickedTopic[]) => void
  /** Questions that can still be added before the set is full. */
  remaining: number
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const shown = useMemo(() => filterTopicTree(tree, query), [tree, query])
  const picked = new Map(selected.map((t) => [t.code, t]))

  const toggle = (code: string) => {
    if (picked.has(code)) {
      onChange(selected.filter((t) => t.code !== code))
      return
    }
    const perTopic = Math.min(DEFAULT_PER_TOPIC, remaining)
    if (perTopic < 1) return
    onChange([...selected, { code, per_topic: perTopic }])
  }

  const setCount = (code: string, n: number) => {
    onChange(selected.map((t) => (t.code === code ? { ...t, per_topic: clampPerTopic(n) } : t)))
  }

  if (tree.length === 0) {
    return (
      <p className="ms-set-composer__hint">
        This subject has no topic list yet, so drills can&apos;t be built from topics. Pick questions by paper
        instead, or set a written prompt.
      </p>
    )
  }

  const pickButton = (code: string, name: string, extra = '') => {
    const on = picked.has(code)
    const full = !on && remaining <= 0
    return (
      <button
        type="button"
        className="ms-set-composer__pick"
        aria-pressed={on}
        aria-disabled={full || undefined}
        onClick={() => {
          if (!full) toggle(code)
        }}
      >
        <span className="ms-set-composer__pick-code">{code}</span>
        <span className="ms-set-composer__pick-preview">
          {name}
          {extra}
        </span>
        <span className="ms-set-composer__pick-marks" aria-hidden>
          {on ? '✓' : '+'}
        </span>
      </button>
    )
  }

  return (
    <div>
      {selected.length > 0 ? (
        <div className="mb-4">
          <p className="ms-set-composer__label mb-2">In this drill</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {selected.map((t) => {
              const label = topicLabel(t.code, names)
              const countId = `${searchId}-count-${t.code}`
              const maxHere = Math.min(MAX_PER_TOPIC, t.per_topic + Math.max(0, remaining))
              return (
                <li
                  key={t.code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--ec-border)] px-3 py-2"
                >
                  <span className="min-w-0 flex-1 text-sm text-[var(--ec-text-primary)]">{label}</span>
                  <span className="flex items-center gap-2">
                    <label htmlFor={countId} className="text-xs text-[var(--ec-text-secondary)]">
                      Questions
                    </label>
                    <select
                      id={countId}
                      className="ec-input min-h-[44px] w-20"
                      value={t.per_topic}
                      onChange={(e) => setCount(t.code, Number(e.target.value))}
                    >
                      {Array.from({ length: MAX_PER_TOPIC }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} disabled={n > maxHere}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ec-btn-ghost inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm"
                      onClick={() => toggle(t.code)}
                      aria-label={`Remove ${label}`}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="ms-set-composer__field">
        <label htmlFor={searchId} className="ms-set-composer__label">
          Find a topic
        </label>
        <input
          id={searchId}
          type="search"
          className="ec-input min-h-[44px] w-full"
          placeholder="Code or name, e.g. 5.4 or integration"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {remaining <= 0 ? (
        <p className="ms-set-composer__hint" role="status">
          The drill is full — lower a topic&apos;s count or remove one to add another.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="ms-set-composer__hint">No topic matches “{query.trim()}”.</p>
      ) : (
        <ul className="ms-set-composer__picker" aria-label="Syllabus topics">
          {shown.map((g) => (
            <li key={g.code}>
              {pickButton(g.code, g.name, g.leaves.length > 0 ? ' — whole section' : '')}
              {g.leaves.length > 0 ? (
                <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 pl-4">
                  {g.leaves.map((l) => (
                    <li key={l.code}>{pickButton(l.code, l.name)}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="ms-set-composer__hint mt-2">
        We pick {DEFAULT_PER_TOPIC} banked questions per topic when you publish — newest papers first, never the
        same question twice.
      </p>
    </div>
  )
}
