'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

type SubjectOption = {
  code: string
  label: string
  hasTree: boolean
}

type Props = {
  subjects: SubjectOption[]
  selectedCode: string
}

export function ProgressSubjectSelector({ subjects, selectedCode }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (subjects.length <= 1) return null

  function onChange(code: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('subject', code)
    router.push(`/dashboard/progress?${params.toString()}`)
  }

  return (
    <div className="mb-6 animate-entry">
      <label className="ec-label-tech mb-2 block">SUBJECT</label>
      <div className="relative inline-block w-full max-w-xs">
        <select
          value={selectedCode}
          onChange={(e) => onChange(e.target.value)}
          className="ec-input w-full appearance-none py-2.5 pr-10 text-sm font-medium transition-colors hover:border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)]"
        >
          {subjects.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
              {!s.hasTree ? ' (analytics coming soon)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ec-text-secondary)]"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
