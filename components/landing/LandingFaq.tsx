'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { LandingSectionReveal } from './LandingSectionReveal'
import { LANDING_FAQ_ITEMS } from '@/lib/faq-data'

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <LandingSectionReveal>
      <div className="mb-10 sm:mb-12">
        <p className="ec-label-tech mb-4">FAQ</p>
        <h2 className="landing-h2">
          <span className="gradient-text">Questions you&apos;ll actually ask.</span>
        </h2>
      </div>

      <div className="space-y-3">
        {LANDING_FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index
          return (
            <div key={item.q} className="ec-card overflow-hidden">
              <button
                type="button"
                id={`faq-btn-${index}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex min-h-[52px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--ec-surface-raised)] sm:px-6 sm:py-5"
              >
                <span className="text-base font-semibold text-[var(--ec-text-primary)] sm:text-lg">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[var(--ec-text-secondary)] transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                id={`faq-panel-${index}`}
                role="region"
                aria-labelledby={`faq-btn-${index}`}
                hidden={!isOpen}
                className="border-t border-[var(--ec-border)] px-5 pb-5 pt-0 sm:px-6 sm:pb-6"
              >
                {isOpen && (
                  <p className="landing-lead pt-4">{item.a}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Link
        href="/faq"
        className="mt-8 inline-flex min-h-[44px] items-center text-sm ec-link"
      >
        See all questions →
      </Link>
    </LandingSectionReveal>
  )
}
