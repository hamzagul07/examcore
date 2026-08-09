'use client'

import { Sheet, type SheetProps } from '@/components/ui/Sheet'

export type DialogProps = SheetProps

/**
 * Modal dialog primitive (Codex DS list).
 * Implemented as the shared Sheet: bottom sheet on phone, centered modal on sm+.
 */
export function Dialog(props: DialogProps) {
  return <Sheet {...props} />
}
