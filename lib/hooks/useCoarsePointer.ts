'use client'

import { useSyncExternalStore } from 'react'

/** Phones / coarse pointers — prefer camera-first upload (MK-06). */
function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(pointer: coarse), (max-width: 640px)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse), (max-width: 640px)').matches
}

function getServerSnapshot() {
  return false
}

export function useCoarsePointer() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
