'use client'

import dynamic from 'next/dynamic'
import { DemoSkeleton } from './DemoSkeleton'

export const ExaminerInkDemoLazy = dynamic(
  () => import('./ExaminerInkDemo').then((m) => m.ExaminerInkDemo),
  {
    ssr: false,
    loading: () => <DemoSkeleton />,
  },
)
