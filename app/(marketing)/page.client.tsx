'use client'

import { motion } from 'framer-motion'

/**
 * Hero entry — staggered cascade for the headline, sub, buttons, mockup.
 */
export function LandingHeroEntry({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Illustrative hero preview — browser chrome + example marking UI.
 */
export function LandingMockupHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative"
    >
      <div className="ec-card relative overflow-hidden p-2 sm:p-3">
        <div className="flex items-center gap-2 border-b border-[var(--ec-border)] px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-500/50" />
          <div className="h-3 w-3 rounded-full bg-amber-500/50" />
          <div className="h-3 w-3 rounded-full bg-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)]" />
          <div className="ml-3 flex-1 rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-3 py-1 text-left font-mono text-xs text-[var(--ec-text-secondary)]">
            examcore.ai/mark
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:p-10 md:grid-cols-2">
          <div className="text-left">
            <p className="ec-label-tech mb-4">EXAMPLE MARKING</p>
            <p className="font-mono text-xs text-[var(--ec-text-secondary)]">
              Cambridge 9709 · May/June 2024 · Q1
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  type: 'spring',
                  stiffness: 180,
                  damping: 14,
                  delay: 0.3,
                }}
                className="text-[112px] font-extrabold leading-none ec-text-gradient brand-breathe"
              >
                3
              </motion.span>
              <span className="text-5xl font-bold text-[var(--ec-text-secondary)]/40">
                /
              </span>
              <span className="text-5xl font-bold text-[var(--ec-text-secondary)]/40">
                3
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--ec-text-secondary)]">
              marks earned · full marks
            </p>

            <div className="mt-6 h-2 overflow-hidden rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  duration: 1.1,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.4,
                }}
                className="animate-shimmer ec-progress-fill-shimmer h-full rounded-full"
                style={{ backgroundSize: '200% 100%' }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <MarkRow
              badge="B1"
              text="Correct x² term from the (1 − 4x)⁶ expansion"
              delay={0.55}
            />
            <MarkRow
              badge="M1"
              text="Equation set up: 240 = 12 × 80a²"
              delay={0.7}
            />
            <MarkRow
              badge="A1"
              text="a = ½ — positive value stated"
              delay={0.85}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function MarkRow({
  badge,
  text,
  delay,
}: {
  badge: string
  text: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ x: 12, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay, duration: 0.4 }}
      className="ec-panel-highlight flex items-start gap-3 rounded-xl p-4 backdrop-blur-sm"
    >
      <span className="ec-mark-badge--earned shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold">
        {badge}
      </span>
      <span className="text-sm leading-relaxed text-[var(--ec-text-primary)]">
        {text}
      </span>
    </motion.div>
  )
}
