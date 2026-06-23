type Listener = (active: boolean) => void

let pendingCount = 0
const listeners = new Set<Listener>()

function emit() {
  const active = pendingCount > 0
  listeners.forEach((fn) => fn(active))
}

/** Coordinates global navigation loading UI (progress bar, brand loader). */
export const navigationLoading = {
  start() {
    pendingCount += 1
    emit()
  },
  stop() {
    if (pendingCount <= 0) return
    pendingCount -= 1
    emit()
  },
  reset() {
    pendingCount = 0
    emit()
  },
  isActive() {
    return pendingCount > 0
  },
  subscribe(fn: Listener) {
    listeners.add(fn)
    fn(pendingCount > 0)
    return () => {
      listeners.delete(fn)
    }
  },
}
