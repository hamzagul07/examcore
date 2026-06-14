'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sparkles, Route, LayoutGrid, ListChecks, type LucideIcon } from 'lucide-react'

export type ProgressTabKey = 'insights' | 'journey' | 'topics' | 'attempts'

type TabDef = { key: ProgressTabKey; label: string; icon: LucideIcon }

const TABS: TabDef[] = [
  { key: 'insights', label: 'Insights', icon: Sparkles },
  { key: 'journey', label: 'Journey', icon: Route },
  { key: 'topics', label: 'Detailed topics', icon: LayoutGrid },
  { key: 'attempts', label: 'All attempts', icon: ListChecks },
]

type Props = {
  insights: ReactNode
  journey: ReactNode
  topics: ReactNode
  attempts: ReactNode
}

function isTabKey(v: string | null): v is ProgressTabKey {
  return v === 'insights' || v === 'journey' || v === 'topics' || v === 'attempts'
}

/**
 * Tab shell for the progress dashboard. The active tab lives in component state
 * (so switching is instant and never re-fetches), while the URL `?tab=` is kept
 * in sync via history.replaceState so the Drill loop can deep-link and tabs are
 * shareable. Only the active tab's content is mounted — the Journey timeline's
 * SVG and animation never run until that tab is opened.
 */
export function ProgressTabs({ insights, journey, topics, attempts }: Props) {
  const searchParams = useSearchParams()
  const initial = searchParams.get('tab')
  const [active, setActive] = useState<ProgressTabKey>(
    isTabKey(initial) ? initial : 'insights'
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('tab') === active) return
    url.searchParams.set('tab', active)
    window.history.replaceState(window.history.state, '', url.toString())
  }, [active])

  const content: Record<ProgressTabKey, ReactNode> = {
    insights,
    journey,
    topics,
    attempts,
  }

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Progress views"
        className="-mx-4 mb-6 overflow-x-auto px-4 pb-px sm:mx-0 sm:px-0 [mask-image:linear-gradient(to_right,black_90%,transparent)] sm:[mask-image:none]"
      >
        <div className="ms-progress-tabs">
          {TABS.map((tab) => {
            const selected = tab.key === active
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setActive(tab.key)}
                className={`ms-progress-tab${selected ? ' on' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">
                  {tab.key === 'topics'
                    ? 'Topics'
                    : tab.key === 'attempts'
                      ? 'Attempts'
                      : tab.label}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div role="tabpanel" key={active} className="min-w-0 animate-entry">
        {content[active]}
      </div>
    </div>
  )
}
