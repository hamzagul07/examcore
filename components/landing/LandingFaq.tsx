'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LandingSectionReveal } from './LandingSectionReveal'

const FAQ_ITEMS = [
  {
    q: 'Is this allowed?',
    a: 'Marking your own past papers is normal revision. Examcore marks work you have already done — like checking against a mark scheme yourself, but faster and more thorough.',
  },
  {
    q: 'Does it really mark like Cambridge?',
    a: 'It uses the official Cambridge mark scheme for each paper. Point-based questions follow B1/M1/A1 exactly. Essays are judged against the real band descriptors.',
  },
  {
    q: 'What if it gets something wrong?',
    a: "AI marking isn't perfect — examiners aren't either. The feedback is detailed enough that you can disagree and still learn. Treat it as a study partner, not your final grade.",
  },
  {
    q: 'Which subjects work?',
    a: 'Fifteen Cambridge A-Levels: Math, Further Math, Physics, Chemistry, Biology, Economics, Business, Accounting, Computer Science, Psychology, Sociology, History, Law, Islamic Studies, and Media Studies.',
  },
  {
    q: 'What about essay subjects?',
    a: 'Yes — History, Sociology, Law, and others. The engine spots whether a question is MCQ, point-based, or an essay, and marks it the right way.',
  },
  {
    q: 'How much does it cost?',
    a: 'Early access is free while we learn from real students. When pricing launches, it will be student-friendly — not tutor-agency money.',
  },
  {
    q: 'My handwriting is messy — will it work?',
    a: 'It reads handwritten answers from photos. Clearer helps, but messy is usually fine — upload a decent snap and give it a go.',
  },
] as const

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
        {FAQ_ITEMS.map((item, index) => {
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
    </LandingSectionReveal>
  )
}
