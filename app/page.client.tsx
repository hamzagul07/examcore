'use client'

import { motion } from 'framer-motion'

/**
 * Hero entry — staggered cascade for the headline, sub, buttons, mockup.
 * Lets `app/page.tsx` stay a server component (for auth detection) while
 * still wrapping the hero in client-side animation.
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
 * The big hero mockup — a dark "browser chrome" panel showing an example
 * marking. Sits under the headline with a dramatic mesh glow behind it.
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
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-500/50" />
          <div className="h-3 w-3 rounded-full bg-amber-500/50" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
          <div className="ml-3 flex-1 rounded-md border border-white/5 bg-dark-900/70 px-3 py-1 text-left font-mono text-xs text-slate-500">
            examcore.ai/mark
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:p-10 md:grid-cols-2">
          {/* Score side */}
          <div className="text-left">
            <p className="ec-label-tech mb-4">EXAMPLE MARKING</p>
            <p className="font-mono text-xs text-slate-500">
              Q1 — Cambridge 9709/12, May/June 2024
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
              <span className="text-5xl font-bold text-slate-700">/</span>
              <span className="text-5xl font-bold text-slate-700">3</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">marks earned · 100%</p>

            <div className="mt-6 h-2 overflow-hidden rounded-full border border-white/5 bg-dark-900">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
                className="animate-shimmer h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.7)]"
                style={{ backgroundSize: '200% 100%' }}
              />
            </div>
          </div>

          {/* Mark rows */}
          <div className="space-y-3">
            <MarkRow
              badge="B1"
              text="Correctly identified the coefficient of x² as 240"
              delay={0.55}
            />
            <MarkRow
              badge="M1"
              text="Set up the equation 240 = 12 × 80a² correctly"
              delay={0.7}
            />
            <MarkRow
              badge="A1"
              text="Found a = 0.5 (within accepted range)"
              delay={0.85}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Compact mockup at the bottom of the "How it works" section.
 */
export function LandingMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7 }}
      className="ec-card relative overflow-hidden p-2 max-w-3xl mx-auto"
    >
      <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-[80px]" />

      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-500/50" />
        <div className="h-3 w-3 rounded-full bg-amber-500/50" />
        <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
        <div className="ml-3 flex-1 rounded-md border border-white/5 bg-dark-900/70 px-3 py-1 text-left font-mono text-xs text-slate-500">
          examcore.ai/dashboard
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <MiniStat label="ATTEMPTS" value="24" accent="emerald" />
        <MiniStat label="AVG" value="87%" accent="cyan" />
        <MiniStat label="BEST" value="100%" accent="violet" />
        <MiniStat label="STREAK" value="9d" accent="orange" />
      </div>
    </motion.div>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'emerald' | 'cyan' | 'violet' | 'orange'
}) {
  const colorMap = {
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    orange: 'text-orange-400',
  } as const
  return (
    <div className="rounded-2xl border border-white/5 bg-dark-900/60 p-4 text-left">
      <p className={`font-mono text-[10px] font-semibold tracking-[0.18em] ${colorMap[accent]}`}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
    </div>
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
      className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm"
    >
      <span className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
        {badge}
      </span>
      <span className="text-sm leading-relaxed text-slate-300">{text}</span>
    </motion.div>
  )
}
