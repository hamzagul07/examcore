'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps, ComponentType } from 'react'
import type { WholePaperFlow as WholePaperFlowStatic } from '@/components/whole-paper/WholePaperFlow'
import type { WholePaperResultView as WholePaperResultViewStatic } from '@/components/WholePaperResultView'

/**
 * Whole-paper upload + result, loaded only when the student switches to it.
 *
 * WholePaperFlow carries the polling client and the whole-paper result view
 * (and through it the same markdown/KaTeX stack). Most /mark visits are
 * single-question, so this was dead weight in the first bundle. Client-only:
 * both are only ever rendered after a user choice.
 */
export const WholePaperFlow: ComponentType<ComponentProps<typeof WholePaperFlowStatic>> =
  dynamic(
    () => import('@/components/whole-paper/WholePaperFlow').then((m) => m.WholePaperFlow),
    {
      ssr: false,
      loading: () => (
        <div className="ec-card p-6" role="status" aria-busy="true">
          <p className="text-sm text-[var(--ec-text-secondary)]">Loading the paper uploader…</p>
        </div>
      ),
    }
  )

export const WholePaperResultView: ComponentType<
  ComponentProps<typeof WholePaperResultViewStatic>
> = dynamic(
  () => import('@/components/WholePaperResultView').then((m) => m.WholePaperResultView),
  {
    ssr: false,
    loading: () => (
      <div className="ec-card p-6" role="status" aria-busy="true">
        <p className="text-sm text-[var(--ec-text-secondary)]">Loading your paper…</p>
      </div>
    ),
  }
)
