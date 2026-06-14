'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FaqCategory, FaqItem } from '@/lib/faq-data'

export function FaqAccordion({
  categories,
  defaultOpenId,
}: {
  categories: FaqCategory[]
  defaultOpenId?: string
}) {
  const [openKey, setOpenKey] = useState<string | null>(
    defaultOpenId ? `${defaultOpenId}-0` : `${categories[0]?.id}-0`
  )

  return (
    <div className="ms-faq-accordion space-y-12">
      {categories.map((category) => (
        <div key={category.id} id={category.id}>
          <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
            {category.title}
          </h2>
          <div className="space-y-3">
            {category.items.map((item, index) => (
              <FaqRow
                key={item.q}
                item={item}
                itemKey={`${category.id}-${index}`}
                isOpen={openKey === `${category.id}-${index}`}
                onToggle={() =>
                  setOpenKey((prev) =>
                    prev === `${category.id}-${index}` ? null : `${category.id}-${index}`
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqRow({
  item,
  itemKey,
  isOpen,
  onToggle,
}: {
  item: FaqItem
  itemKey: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="ec-card overflow-hidden">
      <button
        type="button"
        id={`faq-btn-${itemKey}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${itemKey}`}
        onClick={onToggle}
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
        id={`faq-panel-${itemKey}`}
        role="region"
        aria-labelledby={`faq-btn-${itemKey}`}
        hidden={!isOpen}
        className="border-t border-[var(--ec-border)] px-5 pb-5 sm:px-6 sm:pb-6"
      >
        {isOpen && <p className="landing-lead pt-4">{item.a}</p>}
      </div>
    </div>
  )
}
