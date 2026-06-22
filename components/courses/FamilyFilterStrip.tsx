'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
export function useFamilyFilterFromUrl() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fam, setFam] = useState<SubjectFamily | 'All'>('All')

  useEffect(() => {
    const param = searchParams.get('fam')
    if (param && SUBJECT_FAMILIES.includes(param as SubjectFamily | 'All')) {
      setFam(param as SubjectFamily | 'All')
    }
  }, [searchParams])

  const selectFam = useCallback(
    (next: SubjectFamily | 'All') => {
      setFam(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'All') params.delete('fam')
      else params.set('fam', next)
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return { fam, selectFam }
}
