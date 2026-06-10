'use client'

import { motion } from 'framer-motion'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

/**
 * Pill-shaped starter prompts shown both below the closed CommandBar and on
 * the empty-state of the open chat. Paper prompt pills with red hover accent.
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
          className="ec-prompt"
        >
          {s}
        </motion.button>
      ))}
    </div>
  )
}
