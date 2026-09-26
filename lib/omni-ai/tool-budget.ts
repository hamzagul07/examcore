/**
 * Per-turn budget for Omni's marking tool loop.
 *
 * Before this existed, `fetch_recent_attempts` returned up to 10 attempts,
 * each with the FULL formatted marking payload (question, OCR text, 8k of
 * mark-scheme JSON, per-mark reasoning — ~16-20k chars apiece), and the loop
 * ran up to three rounds. A single "how am I doing?" could push 100k+ tokens
 * of context into every subsequent generation on that turn, all paid for by
 * us and all blocking the first streamed token (code review 2026-09-25, §2
 * "Omni: tool loop can pull 100k+ tokens").
 *
 * Now the listing tool returns excerpts and the model asks for one attempt at
 * a time by id, and this module bounds what all of that can add up to on one
 * turn: at most MAX_TOOL_ROUNDS model↔tool exchanges and MAX_TOOL_RESULT_CHARS
 * of serialized tool output. When a result would overflow, it is trimmed to
 * fit (a detail string is cut, a listing loses its tail) so the model still
 * gets something useful; once nothing fits, the tool answers with an error
 * that tells the model to stop fetching and answer.
 */

export const MAX_TOOL_ROUNDS = 3
export const MAX_TOOL_RESULT_CHARS = 24_000

export const TOOL_BUDGET_EXHAUSTED_ERROR =
  'Tool-result budget for this turn is used up. Do not call any more tools; answer with what you already have.'

export type ToolBudget = {
  /** Characters of serialized tool output still available this turn. */
  remainingChars: number
}

export function createToolBudget(
  maxChars: number = MAX_TOOL_RESULT_CHARS
): ToolBudget {
  return { remainingChars: Math.max(0, maxChars) }
}

export type ToolPayload = Record<string, unknown>

const TRUNCATION_MARK = '…[truncated: budget]'

function serializedLength(payload: ToolPayload): number {
  return JSON.stringify(payload).length
}

/**
 * Cut `payload` down until its JSON fits in `maxChars`, or return null when
 * even the smallest useful form does not fit.
 *
 * Handles the two shapes Omni's tools produce:
 *  - `{ detail: string, ... }` — one attempt's formatted marking; cut the string.
 *  - `{ attempts: unknown[], ... }` — a listing; drop items from the tail.
 * Anything else either fits or does not.
 */
export function fitToolPayload(
  payload: ToolPayload,
  maxChars: number
): ToolPayload | null {
  if (maxChars <= 0) return null
  if (serializedLength(payload) <= maxChars) return payload

  if (typeof payload.detail === 'string') {
    // Overhead is everything except the detail text — including the
    // `truncated` flag added below — and the detail gets the rest.
    const overhead = serializedLength({ ...payload, detail: '', truncated: true })
    const room = maxChars - overhead - TRUNCATION_MARK.length
    // Below this the excerpt is too short to say anything about an attempt.
    if (room < 200) return null
    const detail = `${payload.detail.slice(0, room)}${TRUNCATION_MARK}`
    const fitted = { ...payload, detail, truncated: true }
    return serializedLength(fitted) <= maxChars ? fitted : null
  }

  if (Array.isArray(payload.attempts)) {
    const items = payload.attempts
    for (let n = items.length - 1; n >= 1; n--) {
      const fitted = {
        ...payload,
        attempts: items.slice(0, n),
        truncated: true,
        omitted_count: items.length - n,
      }
      if (serializedLength(fitted) <= maxChars) return fitted
    }
    return null
  }

  return null
}

/**
 * Charge a tool result against the turn's budget and return what should be
 * sent to the model. Mutates `budget`. Never throws; a payload that cannot
 * fit at all becomes the exhausted-budget error, which is small enough to
 * always be affordable.
 */
export function chargeToolResult(
  budget: ToolBudget,
  payload: ToolPayload
): ToolPayload {
  const fitted = fitToolPayload(payload, budget.remainingChars)
  if (!fitted) {
    budget.remainingChars = 0
    return { error: TOOL_BUDGET_EXHAUSTED_ERROR }
  }
  budget.remainingChars = Math.max(
    0,
    budget.remainingChars - serializedLength(fitted)
  )
  return fitted
}
