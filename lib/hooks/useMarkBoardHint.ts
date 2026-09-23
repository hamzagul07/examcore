'use client'

import { useSyncExternalStore } from 'react'
import {
  readMarkBoardHint,
  subscribeMarkBoardHint,
} from '@/lib/marking/mark-board-hint'

const getServerSnapshot = () => null

/**
 * Cached profile board id (see lib/marking/mark-board-hint.ts). Null on the
 * server and during hydration, so the static HTML and the first client render
 * agree; React re-renders with the cached value straight after hydration.
 */
export function useMarkBoardHint(): string | null {
  return useSyncExternalStore(
    subscribeMarkBoardHint,
    readMarkBoardHint,
    getServerSnapshot
  )
}
