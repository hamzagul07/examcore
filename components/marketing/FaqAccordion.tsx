'use client'

import { useState } from 'react'
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
          <div className="ms-faq-list">
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
    <div className="ms-faq-item">
      <button
        type="button"
        id={`faq-btn-${itemKey}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${itemKey}`}
        onClick={onToggle}
        className="ms-faq-q"
      >
        <span>{item.q}</span>
        <span className="ms-pm" aria-hidden>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      <div
        id={`faq-panel-${itemKey}`}
        role="region"
        aria-labelledby={`faq-btn-${itemKey}`}
        hidden={!isOpen}
        className="ms-faq-a"
      >
        {isOpen && <p className="ms-body-2">{item.a}</p>}
      </div>
    </div>
  )
}
