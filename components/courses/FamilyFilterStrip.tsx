'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { SubjectFamily } from '@/lib/courses/margin-notes/types'

export const SUBJECT_FAMILIES: Array<SubjectFamily | 'All'> = [
  'All',
  'Sciences',
  'Maths',
  'Commerce',
  'Humanities',
]

type Props = {
  value: SubjectFamily | 'All'
  onChange: (fam: SubjectFamily | 'All') => void
  className?: string
  tabClassName?: string
}

export function FamilyFilterStrip({ value, onChange, className = 'catalog-filters', tabClassName = 'fam-tab' }: Props) {
  return (
    <div className={className} role="tablist" aria-label="Filter by subject family">
      {SUBJECT_FAMILIES.map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={value === f}
          className={`${tabClassName}${value === f ? ' on' : ''}`}
          onClick={() => onChange(f)}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

/** URL-synced family filter — shared by catalog and subjects directory. */
/**
 * Reads `?fam=` WITHOUT useSearchParams, and that is the whole point.
 *
 * Calling useSearchParams() during render opts the nearest client boundary out
 * of static prerendering, and with no Suspense boundary above it that takes the
 * whole page with it. CourseCatalogPage calls this hook, so /courses and
 * /subjects were prerendered as their loading.tsx skeleton: 345KB of placeholder
 * shipped to crawlers with no <h1> and not one subject name, on the two hubs
 * that link to 1,739 lessons. `next dev` renders them correctly, which is why it
 * survived — only the production prerender bails.
 *
 * Nothing here needed the value at render time. The initial state is always
 * 'All'; the URL is consulted in an effect, and again on click. So reading
 * location directly costs nothing and keeps the page static. popstate is
 * handled explicitly because that reactivity is the one thing useSearchParams
 * was providing for free.
 */
function famFromLocation(): SubjectFamily | 'All' | null {
  if (typeof window === 'undefined') return null
  const param = new URLSearchParams(window.location.search).get('fam')
  if (param && SUBJECT_FAMILIES.includes(param as SubjectFamily | 'All')) {
    return param as SubjectFamily | 'All'
  }
  return null
}

export function useFamilyFilterFromUrl() {
  const pathname = usePathname()
  const router = useRouter()
  const [fam, setFam] = useState<SubjectFamily | 'All'>('All')

  useEffect(() => {
    const sync = () => {
      const next = famFromLocation()
      if (next) setFam(next)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const selectFam = useCallback(
    (next: SubjectFamily | 'All') => {
      setFam(next)
      const params = new URLSearchParams(
        typeof window === 'undefined' ? '' : window.location.search
      )
      if (next === 'All') params.delete('fam')
      else params.set('fam', next)
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [pathname, router]
  )

  return { fam, selectFam }
}
