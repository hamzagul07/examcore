/** Tracks Gemini 429 rate and throttles pool concurrency (floor 2). */
export class AdaptiveConcurrency {
  private current: number
  private readonly floor: number
  private readonly ceiling: number
  private windowCalls = 0
  private window429s = 0
  private lastAdjustAt = Date.now()
  private readonly adjustIntervalMs: number
  private readonly rateThreshold: number

  constructor(
    initial: number,
    opts: { min?: number; max?: number; adjustIntervalMs?: number; rateThreshold?: number } = {}
  ) {
    this.floor = opts.min ?? 2
    this.ceiling = opts.max ?? initial
    this.adjustIntervalMs = opts.adjustIntervalMs ?? 60_000
    this.rateThreshold = opts.rateThreshold ?? 0.1
    this.current = Math.min(this.ceiling, Math.max(this.floor, initial))
  }

  get value(): number {
    this.maybeAdjust()
    return this.current
  }

  recordApiOutcome(was429: boolean): void {
    this.windowCalls++
    if (was429) this.window429s++
    this.maybeAdjust()
  }

  private maybeAdjust(): void {
    const now = Date.now()
    if (now - this.lastAdjustAt < this.adjustIntervalMs) return
    if (this.windowCalls === 0) {
      this.lastAdjustAt = now
      return
    }

    const rate = this.window429s / this.windowCalls
    if (rate > this.rateThreshold && this.current > this.floor) {
      this.current -= 1
    }

    this.windowCalls = 0
    this.window429s = 0
    this.lastAdjustAt = now
  }
}
