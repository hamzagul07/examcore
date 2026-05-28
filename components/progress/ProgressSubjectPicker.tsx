'use client'

import { Suspense } from 'react'
import { ProgressSubjectSelector } from './ProgressSubjectSelector'

type SubjectOption = {
  code: string
  label: string
  hasTree: boolean
}

type Props = {
  subjects: SubjectOption[]
  selectedCode: string
}

function SelectorInner(props: Props) {
  return <ProgressSubjectSelector {...props} />
}

export function ProgressSubjectPicker(props: Props) {
  return (
    <Suspense fallback={null}>
      <SelectorInner {...props} />
    </Suspense>
  )
}
