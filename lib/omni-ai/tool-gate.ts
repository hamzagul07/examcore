/**
 * Decide whether Omni should run the blocking tool loop before streaming.
 *
 * The loop always costs at least one full generateContent round — even when the
 * model never calls a tool — which is the main source of "Thinking…" lag. Only
 * pay that cost when the user is likely asking about past marking history that
 * isn't already in the prompt.
 */
export function shouldRunMarkingToolLoop(
  query: string,
  opts: { hasFocusedAttempt: boolean }
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false

  // Focused attempt is already injected — only look up history for cross-attempt asks.
  if (opts.hasFocusedAttempt) {
    return /\b(previous|earlier|last|other|past|recent|history|before|trend|progress|weak|weaker|improvement|compared?|vs\.?|versus|across|all my|my other|older|how am i|improving)\b/i.test(
      q
    )
  }

  // Product / account how-tos never need attempt lookup. Keep this narrow so
  // coaching asks like "How do I get to A*?" still enable tools.
  if (
    /\b(upload|sign ?up|log ?in|pricing|subscribe|refund|password|account settings?)\b/i.test(
      q
    ) ||
    /\bhow (do|can|to) (i )?(upload|sign|log|use markscheme|open the)\b/i.test(q)
  ) {
    return false
  }

  // No focused attempt: enable tools for personal coaching / history asks.
  return /\b(my (marks?|score|scores|attempts?|progress|grade|work|answers?|mistakes?|weakest)|how did i|where did i|what did i|how am i|am i improving|improving|losing marks?|lost marks?|marks? (i |i've )?lost|weakest|weak topic|what should i work|work on next|how (do|can) i (get|reach|improve)|get to a|last (attempt|paper|marks?)|marked work|recent attempts?|marking history|feedback on|show me my)\b/i.test(
    q
  )
}
