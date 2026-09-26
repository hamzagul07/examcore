'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps, ComponentType } from 'react'
import type { MarkingResultView as MarkingResultViewStatic } from '@/components/MarkingResultView'

/**
 * The result view, loaded only once there is a result.
 *
 * MarkingResultView pulls react-markdown, rehype-katex and KaTeX; statically
 * imported it sat in /mark's 172 KB client module for every visitor, most of
 * whom never get past the uploader. Same shape as CinematicMarkingExperienceLazy.
 * Client-only (`ssr: false`): it never renders before an interaction.
 */
export const MarkingResultView: ComponentType<ComponentProps<typeof MarkingResultViewStatic>> =
  dynamic(
    () => import('@/components/MarkingResultView').then((m) => m.MarkingResultView),
    {
      ssr: false,
      loading: () => (
        <div className="ec-card p-6" role="status" aria-busy="true">
          <p className="text-sm text-[var(--ec-text-secondary)]">Loading your marks…</p>
        </div>
      ),
    }
  )
