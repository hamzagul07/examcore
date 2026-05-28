'use client'

import { motion } from 'framer-motion'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

/**
 * Pill-shaped starter prompts shown both below the closed CommandBar and on
 * the empty-state of the open chat. Hover state tints toward brand emerald so
 * they read as the primary affordance.
 */
export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((s, i) => (
        <motion.button
          key={s}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(s)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          {s}
        </motion.button>
      ))}
    </div>
  )
}
